import { Message } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { Command } from "../../types";
import { stopPlayer } from "../../services/music/player";
import { errorEmbed, successEmbed } from "../../utils/embeds";

export const stopCommand: Command = {
  name: "stop",
  aliases: ["leave", "dc", "disconnect"],
  description: "Para a música e sai do canal",

  async execute(message: Message): Promise<void> {
    const guildId = message.guildId!;
    const connection = getVoiceConnection(guildId);

    if (!connection) {
      await message.reply({ embeds: [errorEmbed("Não estou em nenhum canal de voz.")] });
      return;
    }

    stopPlayer(guildId);
    connection.destroy();
    await message.reply({ embeds: [successEmbed("Desconectado e fila limpa.")] });
  },
};
