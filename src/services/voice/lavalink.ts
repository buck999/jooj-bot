import type { Client, User, VoiceState } from "discord.js";
import { LavalinkManager, type Player } from "lavalink-client";
import type { Config } from "../../config";
import type { Service } from "../../core/loader";
import { logger as rootLogger } from "../../core/logger";

const logger = rootLogger.child("voice");

/** Pacotes Opus esperados por minuto por player (1 a cada 20 ms) */
const EXPECTED_FRAMES_PER_MINUTE = 3000;

/** Quem pediu a faixa, no formato guardado em `track.requester` */
export interface Requester {
  id: string;
  displayName: string;
}

/** Marcador em `track.userData` para módulos que não querem anúncio de "tocando agora" */
export const SILENT_TRACK_KEY = "silent";

export class VoiceUnavailableError extends Error {
  constructor() {
    super("O servidor de áudio (Lavalink) está offline. Tente de novo em instantes.");
  }
}

export interface JoinOptions {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
}

/**
 * Dono único das conexões de voz do bot, via Lavalink. O áudio nunca passa por
 * este processo: o Lavalink busca, decodifica e envia os pacotes ao Discord.
 */
export class VoiceService implements Service {
  readonly manager: LavalinkManager;
  readonly #client: Client;
  readonly #config: Config;
  readonly #emptyTimers = new Map<string, NodeJS.Timeout>();

  constructor(client: Client, config: Config) {
    this.#client = client;
    this.#config = config;

    if (!config.lavalink.password) throw new Error("LAVALINK_PASSWORD não configurada");

    this.manager = new LavalinkManager({
      nodes: [
        {
          id: "main",
          host: config.lavalink.host,
          port: config.lavalink.port,
          authorization: config.lavalink.password,
          // Lavalink pode subir depois do bot (ex.: docker compose): tenta por ~5 min
          retryAmount: 60,
          retryDelay: 5_000,
        },
      ],
      sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard.send(payload),
      autoSkip: true,
      autoSkipOnResolveError: true,
      playerOptions: {
        defaultSearchPlatform: "ytsearch",
        onDisconnect: { autoReconnect: true, autoReconnectOnlyWithTracks: true, destroyPlayer: false },
        onEmptyQueue: { destroyAfterMs: config.voice.leaveOnQueueEndMs },
        requesterTransformer: (requester): Requester => {
          const user = requester as User | Requester;
          return { id: user.id, displayName: "displayName" in user ? user.displayName : String(user) };
        },
      },
      queueOptions: { maxPreviousTracks: 10 },
    });

    // O Lavalink precisa dos eventos de voz do gateway para conectar no canal
    client.on("raw", (packet) => void this.manager.sendRawData(packet));
    client.on("voiceStateUpdate", (oldState, newState) => this.#onVoiceStateUpdate(oldState, newState));

    this.#registerNodeLogging();
  }

  async start(): Promise<void> {
    const user = this.#client.user;
    if (!user) throw new Error("VoiceService.start() chamado antes do clientReady");
    await this.manager.init({ id: user.id, username: user.username });
  }

  async stop(): Promise<void> {
    for (const timer of this.#emptyTimers.values()) clearTimeout(timer);
    this.#emptyTimers.clear();
    await Promise.allSettled([...this.manager.players.values()].map((player) => player.destroy("shutdown")));
  }

  get available(): boolean {
    return this.manager.useable;
  }

  getPlayer(guildId: string): Player | undefined {
    return this.manager.getPlayer(guildId);
  }

  /** Retorna o player da guild, criando e conectando no canal se ainda não existir. */
  async join({ guildId, voiceChannelId, textChannelId }: JoinOptions): Promise<Player> {
    if (!this.available) throw new VoiceUnavailableError();

    const existing = this.manager.getPlayer(guildId);
    if (existing) {
      if (!existing.connected) await existing.connect();
      return existing;
    }

    const player = this.manager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      volume: 100,
    });
    await player.connect();
    return player;
  }

  /** Sai do canal se ninguém (além de bots) ficar nele por `leaveOnEmptyMs` */
  #onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
    const guildId = newState.guild.id;
    const player = this.manager.getPlayer(guildId);
    if (!player?.voiceChannelId) return;

    const touched = [oldState.channelId, newState.channelId].includes(player.voiceChannelId);
    if (!touched) return;

    const channel = newState.guild.channels.cache.get(player.voiceChannelId);
    const humans = channel?.isVoiceBased() ? channel.members.filter((member) => !member.user.bot).size : 0;

    const pending = this.#emptyTimers.get(guildId);
    if (humans > 0) {
      if (pending) {
        clearTimeout(pending);
        this.#emptyTimers.delete(guildId);
      }
      return;
    }
    if (pending) return;

    this.#emptyTimers.set(
      guildId,
      setTimeout(() => {
        this.#emptyTimers.delete(guildId);
        logger.info(`Canal vazio em ${guildId}, saindo`);
        void this.manager.getPlayer(guildId)?.destroy("canal vazio");
      }, this.#config.voice.leaveOnEmptyMs),
    );
  }

  #registerNodeLogging(): void {
    const nodes = this.manager.nodeManager;
    // Enquanto o node está fora, as tentativas de reconexão repetem o mesmo erro:
    // loga só a primeira falha e a volta, o resto vai para o debug
    const down = new Set<string>();
    const reportDown = (id: string, message: string, detail?: unknown) => {
      if (down.has(id)) return logger.debug(message, detail ?? "");
      down.add(id);
      logger.error(`${message} (tentando reconectar a cada 5 s)`, detail ?? "");
    };

    nodes.on("connect", (node) => {
      down.delete(node.id);
      logger.info(`Lavalink node "${node.id}" conectado`);
    });
    nodes.on("reconnecting", (node) => logger.debug(`Reconectando ao Lavalink node "${node.id}"...`));
    nodes.on("disconnect", (node, reason) =>
      reportDown(node.id, `Lavalink node "${node.id}" desconectado`, reason.reason),
    );
    nodes.on("error", (node, error) => reportDown(node.id, `Erro no Lavalink node "${node.id}": ${error.message}`));

    // A cada ~60 s o Lavalink manda estatísticas de envio de áudio. É a medida
    // objetiva dos "cortes": nulled = frames que faltaram, deficit = frames atrasados.
    nodes.on("raw", (node, payload) => {
      const stats = payload as {
        op?: string;
        playingPlayers?: number;
        frameStats?: { sent?: number; nulled?: number; deficit?: number } | null;
      };
      if (stats.op !== "stats" || !stats.playingPlayers || !stats.frameStats) return;

      const { sent = 0, nulled = 0, deficit = 0 } = stats.frameStats;
      const expected = EXPECTED_FRAMES_PER_MINUTE * stats.playingPlayers;
      const message =
        `[${node.id}] frames/min: enviados ${sent}/${expected}, nulos ${nulled}, déficit ${deficit} ` +
        `(${stats.playingPlayers} player(s) tocando)`;
      if (nulled + deficit > expected * 0.01) logger.warn(`${message} -> perda de áudio acima de 1%`);
      else logger.debug(message);
    });
  }
}
