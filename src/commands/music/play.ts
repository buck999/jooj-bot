import { Message } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import { Command } from "../../types";
import { resolveTracks } from "../../services/music/resolver";
import { addTrack, getCurrentTrack } from "../../services/music/queue";
import { playCurrentTrack, stopPlayer } from "../../services/music/player";
import { nowPlayingEmbed, errorEmbed, successEmbed } from "../../utils/embeds";

export const playCommand: Command = {
  name: "play",
  aliases: ["p"],
  description: "Toca uma música ou adiciona na fila",

  async execute(message: Message, args: readonly string[]): Promise<void> {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const query = args.join(" ");
    if (!query) {
      await message.reply({ embeds: [errorEmbed("Uso: `!play <url ou busca>`")] });
      return;
    }

    const guildId = message.guildId!;
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    const tracks = await resolveTracks(query, message.author.displayName);
    if (tracks.length === 0) {
      await message.reply({ embeds: [errorEmbed("Não encontrei nenhuma música.")] });
      return;
    }

    const wasEmpty = !getCurrentTrack(guildId);

    for (const track of tracks) {
      addTrack(guildId, track);
    }

    let connection = getVoiceConnection(guildId);
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: message.guild!.voiceAdapterCreator,
      });
    }

    if (tracks.length === 1) {
      if (wasEmpty) {
        await message.reply({ embeds: [nowPlayingEmbed(tracks[0])] });
      } else {
        await message.reply({ embeds: [successEmbed(`Adicionado à fila: **${tracks[0].title}**`)] });
      }
    } else {
      await message.reply({
        embeds: [successEmbed(`Adicionadas **${tracks.length}** músicas à fila.`)],
      });
    }

    if (wasEmpty) {
      playCurrentTrack(guildId, connection, () => {
        stopPlayer(guildId);
        connection?.destroy();
      });
    }
  },
};
