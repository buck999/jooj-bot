import { EmbedBuilder } from "discord.js";
import type { Track, UnresolvedTrack } from "lavalink-client";
import { BRAND_COLOR } from "../../core/embeds";
import type { Requester } from "../../services/voice/lavalink";

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function trackDuration(track: Track | UnresolvedTrack): string {
  if (track.info.isStream) return "🔴 ao vivo";
  return track.info.duration ? formatDuration(track.info.duration) : "?";
}

export function trackLink(track: Track | UnresolvedTrack): string {
  const title = track.info.title.replace(/[[\]]/g, "");
  return track.info.uri ? `[${title}](${track.info.uri})` : title;
}

function requesterName(track: Track | UnresolvedTrack): string {
  return (track.requester as Requester | undefined)?.displayName ?? "?";
}

export function nowPlayingEmbed(track: Track, positionMs?: number): EmbedBuilder {
  const duration =
    positionMs !== undefined && !track.info.isStream
      ? `${formatDuration(positionMs)} / ${trackDuration(track)}`
      : trackDuration(track);

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle("🎵 Tocando agora")
    .setDescription(`**${trackLink(track)}**\n${track.info.author}`)
    .addFields(
      { name: "Duração", value: duration, inline: true },
      { name: "Pedido por", value: requesterName(track), inline: true },
    );
  if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
  return embed;
}

export function queueEmbed(
  current: Track,
  upcoming: readonly (Track | UnresolvedTrack)[],
  totalUpcoming: number,
): EmbedBuilder {
  const lines = [
    `▶️ **${trackLink(current)}** — ${trackDuration(current)}`,
    ...upcoming.map((track, i) => `${i + 1}. ${trackLink(track)} — ${trackDuration(track)}`),
  ];
  if (totalUpcoming > upcoming.length) lines.push(`… e mais ${totalUpcoming - upcoming.length}`);

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle("📋 Fila de músicas")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `${totalUpcoming + 1} música(s) na fila` });
}
