import type { EmbedBuilder } from "discord.js";
import type { Player, Track } from "lavalink-client";
import { errorEmbed } from "../../core/embeds";
import type { BotContext } from "../../core/module";
import { SILENT_TRACK_KEY } from "../../services/voice/lavalink";
import { nowPlayingEmbed } from "./embeds";

/** Chave em player.set(): instante do comando que iniciou a reprodução */
export const REQUESTED_AT_KEY = "music:requestedAt";

function isSilent(track: Track | { userData?: Record<string, unknown> } | null): boolean {
  return !!track?.userData?.[SILENT_TRACK_KEY];
}

export function registerMusicEvents(ctx: BotContext): void {
  const manager = ctx.service("voice").manager;

  const send = (player: Player, embed: EmbedBuilder) => {
    const channel = player.textChannelId ? ctx.client.channels.cache.get(player.textChannelId) : undefined;
    if (channel?.isSendable()) {
      channel.send({ embeds: [embed] }).catch((error) => ctx.logger.debug("Falha ao enviar mensagem:", error));
    }
  };

  manager.on("trackStart", (player, track) => {
    if (!track || isSilent(track)) return;

    const requestedAt = player.get<number | undefined>(REQUESTED_AT_KEY);
    if (requestedAt) {
      player.set(REQUESTED_AT_KEY, undefined);
      ctx.logger.info(`Comando -> início do áudio: ${Date.now() - requestedAt}ms ("${track.info.title}")`);
    }

    send(player, nowPlayingEmbed(track));
  });

  manager.on("trackError", (player, track, payload) => {
    if (isSilent(track)) return;
    const title = track?.info.title ?? "?";
    ctx.logger.error(`Erro ao tocar "${title}":`, payload.exception);
    send(player, errorEmbed(`Não consegui tocar **${title}**: ${payload.exception?.message ?? "erro desconhecido"}`));
  });

  manager.on("trackStuck", (player, track, payload) => {
    ctx.logger.warn(`Faixa travada "${track?.info.title ?? "?"}" (${payload.thresholdMs}ms), pulando`);
  });
}
