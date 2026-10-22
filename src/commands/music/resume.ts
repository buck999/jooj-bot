import { Message } from "discord.js";
import { useQueue } from "discord-player";
import { Command } from "../../types";
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

    const queue = useQueue(message.guildId!);
    if (queue?.node.isPaused() && queue.node.resume()) {
      await message.reply({ embeds: [successEmbed("Música retomada.")] });
    } else {
      await message.reply({ embeds: [errorEmbed("Não há música pausada.")] });
    }
  },
};
