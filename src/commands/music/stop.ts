import { Message } from "discord.js";
import { useQueue } from "discord-player";
import { Command } from "../../types";
import { errorEmbed, successEmbed } from "../../utils/embeds";

export const stopCommand: Command = {
  name: "stop",
  aliases: ["leave", "dc", "disconnect"],
  description: "Para a música e sai do canal",

  async execute(message: Message): Promise<void> {
    const queue = useQueue(message.guildId!);
    if (!queue) {
      await message.reply({ embeds: [errorEmbed("Não estou em nenhum canal de voz.")] });
      return;
    }

    queue.delete();
    await message.reply({ embeds: [successEmbed("Desconectado e fila limpa.")] });
  },
};
