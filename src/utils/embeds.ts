import { EmbedBuilder } from "discord.js";
import { Track } from "discord-player";

export function nowPlayingEmbed(track: Track): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("🎵 Tocando agora")
    .setDescription(`**[${track.cleanTitle}](${track.url})**`)
    .addFields(
      { name: "Duração", value: track.duration || "?", inline: true },
      { name: "Pedido por", value: track.requestedBy?.displayName ?? "?", inline: true },
    );
}

export function queueEmbed(current: Track, upcoming: readonly Track[], total: number): EmbedBuilder {
  const list = [
    `▶️ **${current.cleanTitle}** — ${current.duration}`,
    ...upcoming.map((t, i) => `${i + 1}. **${t.cleanTitle}** — ${t.duration}`),
  ].join("\n");

  return new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle("📋 Fila de músicas")
    .setDescription(list)
    .setFooter({ text: `${total} música(s) na fila` });
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
