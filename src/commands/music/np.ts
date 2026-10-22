import { Message } from "discord.js";
import { useQueue } from "discord-player";
import { Command } from "../../types";
import { nowPlayingEmbed, errorEmbed } from "../../utils/embeds";

export const npCommand: Command = {
  name: "np",
  aliases: ["nowplaying", "tocando"],
  description: "Mostra a música tocando agora",

  async execute(message: Message): Promise<void> {
    const track = useQueue(message.guildId!)?.currentTrack;
    if (!track) {
      await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
      return;
    }

    await message.reply({ embeds: [nowPlayingEmbed(track)] });
  },
};
