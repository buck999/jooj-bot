import { Message } from "discord.js";
import { useQueue } from "discord-player";
import { Command } from "../../types";
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

    const queue = useQueue(message.guildId!);
    if (queue?.isPlaying() && !queue.node.isPaused() && queue.node.pause()) {
      await message.reply({ embeds: [successEmbed("Música pausada.")] });
    } else {
      await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
    }
  },
};
