import { Message } from "discord.js";
import { useQueue } from "discord-player";
import { Command } from "../../types";
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

    const queue = useQueue(message.guildId!);
    if (queue?.isPlaying() && queue.node.skip()) {
      await message.reply({ embeds: [successEmbed("Música pulada.")] });
    } else {
      await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
    }
  },
};
