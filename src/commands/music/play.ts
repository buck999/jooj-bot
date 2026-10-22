import { Message } from "discord.js";
import { Command } from "../../types";
import { playQuery } from "../../services/music/player";
import { errorEmbed } from "../../utils/embeds";
import { logger } from "../../utils/logger";

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

    if (!message.inGuild()) return;

    await message.channel.sendTyping();

    try {
      await playQuery(voiceChannel, query, message.channel, message.author);
    } catch (error) {
      logger.error(`Erro ao tocar "${query}":`, error);
      await message.reply({ embeds: [errorEmbed("Não consegui tocar essa música.")] });
    }
  },
};
