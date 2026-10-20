import { Message } from "discord.js";
import { Command } from "../../types";
import { skipCurrent } from "../../services/music/player";
import { errorEmbed, successEmbed } from "../../utils/embeds";

export const skipCommand: Command = {
  name: "skip",
  aliases: ["s", "next"],
  description: "Pula a música atual",

  async execute(message: Message): Promise<void> {
    if (!message.member?.voice.channel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const skipped = skipCurrent(message.guildId!);
    if (skipped) {
      await message.reply({ embeds: [successEmbed("Música pulada.")] });
    } else {
      await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
    }
  },
};
