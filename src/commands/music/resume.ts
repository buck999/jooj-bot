import { Message } from "discord.js";
import { Command } from "../../types";
import { resumePlayer } from "../../services/music/player";
import { errorEmbed, successEmbed } from "../../utils/embeds";

export const resumeCommand: Command = {
  name: "resume",
  aliases: ["unpause", "continuar"],
  description: "Retoma a música pausada",

  async execute(message: Message): Promise<void> {
    if (!message.member?.voice.channel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const resumed = resumePlayer(message.guildId!);
    if (resumed) {
      await message.reply({ embeds: [successEmbed("Música retomada.")] });
    } else {
      await message.reply({ embeds: [errorEmbed("Não há música pausada.")] });
    }
  },
};
