import { EmbedBuilder } from "discord.js";
import { Track } from "../types";

export function nowPlayingEmbed(track: Track): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("🎵 Tocando agora")
    .setDescription(`**[${track.title}](${track.url})**`)
    .addFields(
      { name: "Duração", value: track.duration, inline: true },
      { name: "Pedido por", value: track.requestedBy, inline: true },
    );
}

export function queueEmbed(tracks: readonly Track[], current: number): EmbedBuilder {
  const list = tracks
    .map((t, i) => {
      const prefix = i === current ? "▶️" : `${i + 1}.`;
      return `${prefix} **${t.title}** — ${t.duration}`;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("📋 Fila de músicas")
    .setDescription(list || "Fila vazia.")
    .setFooter({ text: `${tracks.length} música(s) na fila` });
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription(`❌ ${message}`);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x00ff00)
    .setDescription(`✅ ${message}`);
}
