import { Message } from "discord.js";
import { Command } from "../../types";
import { getTracks, getCurrentIndex } from "../../services/music/queue";
import { queueEmbed, errorEmbed } from "../../utils/embeds";

export const queueCommand: Command = {
  name: "queue",
  aliases: ["q", "fila"],
  description: "Mostra a fila de músicas",

  async execute(message: Message): Promise<void> {
    const guildId = message.guildId!;
    const tracks = getTracks(guildId);

    if (tracks.length === 0) {
      await message.reply({ embeds: [errorEmbed("A fila está vazia.")] });
      return;
    }

    await message.reply({ embeds: [queueEmbed(tracks, getCurrentIndex(guildId))] });
  },
};
