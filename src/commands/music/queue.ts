import { Message } from "discord.js";
import { useQueue } from "discord-player";
import { Command } from "../../types";
import { queueEmbed, errorEmbed } from "../../utils/embeds";

export const queueCommand: Command = {
  name: "queue",
  aliases: ["q", "fila"],
  description: "Mostra a fila de músicas",

  async execute(message: Message): Promise<void> {
    const queue = useQueue(message.guildId!);
    const current = queue?.currentTrack;

    if (!queue || !current) {
      await message.reply({ embeds: [errorEmbed("A fila está vazia.")] });
      return;
    }

    const upcoming = queue.tracks.toArray().slice(0, 10);
    await message.reply({ embeds: [queueEmbed(current, upcoming, queue.tracks.size + 1)] });
  },
};
