import type { Message } from "discord.js";
import type { Player } from "lavalink-client";
import { errorEmbed } from "../../core/embeds";
import type { BotContext } from "../../core/module";

/**
 * Para comandos de controle (skip, pause...): exige música tocando e o autor
 * no mesmo canal do bot. Responde o erro e devolve undefined se não passar.
 */
export async function controllablePlayer(message: Message<true>, ctx: BotContext): Promise<Player | undefined> {
  const player = ctx.service("voice").getPlayer(message.guildId);
  if (!player?.queue.current) {
    await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
    return undefined;
  }
  if (message.member?.voice.channelId !== player.voiceChannelId) {
    await message.reply({ embeds: [errorEmbed(`Você precisa estar em <#${player.voiceChannelId}>.`)] });
    return undefined;
  }
  return player;
}
