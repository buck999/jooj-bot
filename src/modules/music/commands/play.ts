import { errorEmbed, successEmbed } from "../../../core/embeds";
import type { Command } from "../../../core/module";
import { VoiceUnavailableError } from "../../../services/voice/lavalink";
import { trackLink } from "../embeds";
import { REQUESTED_AT_KEY } from "../events";

export const playCommand: Command = {
  name: "play",
  aliases: ["p"],
  description: "Toca uma música (link ou busca) ou adiciona na fila",

  async execute(message, args, ctx) {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const query = args.join(" ");
    if (!query) {
      await message.reply({ embeds: [errorEmbed(`Uso: \`${ctx.config.prefix}play <link ou busca>\``)] });
      return;
    }

    const voice = ctx.service("voice");
    let player = voice.getPlayer(message.guildId);
    if (player && player.voiceChannelId !== voiceChannel.id) {
      if (player.queue.current) {
        await message.reply({ embeds: [errorEmbed(`Já estou tocando em <#${player.voiceChannelId}>.`)] });
        return;
      }
      // Player parado em outro canal (fila acabou): recomeça no canal de quem pediu
      await player.destroy("mudança de canal");
      player = undefined;
    }

    await message.channel.sendTyping().catch(() => {});

    try {
      player = await voice.join({
        guildId: message.guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channelId,
      });
    } catch (error) {
      if (error instanceof VoiceUnavailableError) {
        await message.reply({ embeds: [errorEmbed(error.message)] });
        return;
      }
      throw error;
    }

    const result = await player.search({ query }, message.author);

    if (result.loadType === "error" || result.loadType === "empty" || result.tracks.length === 0) {
      const reason = result.exception?.message;
      ctx.logger.warn(`Nada encontrado para "${query}"${reason ? `: ${reason}` : ""}`);
      await message.reply({ embeds: [errorEmbed(reason ? `Não consegui carregar: ${reason}` : "Nada encontrado.")] });
      if (!player.queue.current) await player.destroy("busca vazia");
      return;
    }

    const wasPlaying = player.playing || !!player.queue.current;

    if (result.loadType === "playlist") {
      await player.queue.add(result.tracks);
      await message.reply({
        embeds: [successEmbed(`Playlist **${result.playlist?.title ?? "?"}**: ${result.tracks.length} música(s) na fila.`)],
      });
    } else {
      const track = result.tracks[0];
      await player.queue.add(track);
      if (wasPlaying) {
        await message.reply({
          embeds: [successEmbed(`Adicionado à fila (#${player.queue.tracks.length}): **${trackLink(track)}**`)],
        });
      }
    }

    if (!wasPlaying) {
      // Usado no trackStart para medir comando -> início do áudio
      player.set(REQUESTED_AT_KEY, message.createdTimestamp);
      await player.play();
    }
  },
};
