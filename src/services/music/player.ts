import { Client, GuildTextBasedChannel, User, VoiceBasedChannel } from "discord.js";
import { Player, GuildQueueEvent } from "discord-player";
import { DefaultExtractors } from "@discord-player/extractor";
import { YoutubeSabrExtractor } from "discord-player-googlevideo";
import { logger } from "../../utils/logger";
import { nowPlayingEmbed, successEmbed } from "../../utils/embeds";

let player: Player | undefined;

export async function initPlayer(client: Client): Promise<Player> {
  if (player) return player;

  player = new Player(client);

  player.on("debug", (message) => logger.debug(`[player] ${message}`));
  player.events.on("debug", (_queue, message) => logger.debug(`[queue] ${message}`));

  player.events.on(GuildQueueEvent.PlayerStart, (queue, track) => {
    const channel = queue.metadata as GuildTextBasedChannel;
    channel.send({ embeds: [nowPlayingEmbed(track)] }).catch(() => {});
  });

  player.events.on(GuildQueueEvent.AudioTrackAdd, (queue, track) => {
    if (!queue.isPlaying()) return;
    const channel = queue.metadata as GuildTextBasedChannel;
    channel.send({ embeds: [successEmbed(`Adicionado à fila: **${track.cleanTitle}**`)] }).catch(() => {});
  });

  player.events.on(GuildQueueEvent.AudioTracksAdd, (queue, tracks) => {
    const channel = queue.metadata as GuildTextBasedChannel;
    channel.send({ embeds: [successEmbed(`Adicionadas **${tracks.length}** músicas à fila.`)] }).catch(() => {});
  });

  player.events.on(GuildQueueEvent.EmptyQueue, (queue) => {
    const channel = queue.metadata as GuildTextBasedChannel;
    channel.send({ embeds: [successEmbed("Fila vazia!")] }).catch(() => {});
  });

  player.events.on(GuildQueueEvent.PlayerError, (_queue, error, track) => {
    logger.error(`Erro no player tocando ${track?.cleanTitle}:`, error);
  });

  player.events.on(GuildQueueEvent.Error, (_queue, error) => {
    logger.error("Erro na fila:", error);
  });

  await player.extractors.loadMulti(DefaultExtractors);
  await player.extractors.register(YoutubeSabrExtractor, {});

  return player;
}

function normalizeQuery(query: string): string {
  try {
    // Mix/Radio do YouTube (list=RD...) não são acessíveis pela API,
    // então remove o parâmetro list e toca só o vídeo
    const url = new URL(query);
    const listId = url.searchParams.get("list");
    if (listId && listId.startsWith("RD")) {
      url.searchParams.delete("list");
      url.searchParams.delete("start_radio");
      url.searchParams.delete("index");
      return url.toString();
    }
    return query;
  } catch {
    // Não é URL — prefixar com ytsearch: para buscar no YouTube
    return `ytsearch:${query}`;
  }
}

export async function playQuery(
  voiceChannel: VoiceBasedChannel,
  query: string,
  textChannel: GuildTextBasedChannel,
  requestedBy: User,
): Promise<void> {
  if (!player) throw new Error("Player não inicializado.");

  await player.play(voiceChannel, normalizeQuery(query), {
    requestedBy,
    nodeOptions: {
      metadata: textChannel,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 30000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 60000,
    },
  });
}
