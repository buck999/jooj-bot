import { Message } from "discord.js";
import { Command } from "../../types";
import { pausePlayer } from "../../services/music/player";
import { errorEmbed, successEmbed } from "../../utils/embeds";

export const pauseCommand: Command = {
  name: "pause",
  aliases: ["pausar"],
  description: "Pausa a música atual",

  async execute(message: Message): Promise<void> {
    if (!message.member?.voice.channel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const paused = pausePlayer(message.guildId!);
    if (paused) {
      await message.reply({ embeds: [successEmbed("Música pausada.")] });
    } else {
      await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
    }
  },
};
