import type { Message } from "discord.js";
import { errorEmbed } from "./embeds";
import type { LoadedBot } from "./loader";
import { logger } from "./logger";

/** Despacha mensagens com prefixo para o comando registrado pelo módulo dono */
export function createMessageHandler(bot: LoadedBot, prefix: string) {
  return async (message: Message): Promise<void> => {
    if (message.author.bot || !message.inGuild()) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const name = args.shift()?.toLowerCase();
    if (!name) return;

    const entry = bot.commands.get(name);
    if (!entry) return;

    try {
      await entry.command.execute(message, args, entry.ctx);
    } catch (error) {
      entry.ctx.logger.error(`Erro no comando "${name}":`, error);
      await message.reply({ embeds: [errorEmbed("Ocorreu um erro ao executar esse comando.")] }).catch((replyError) => {
        logger.debug("Não foi possível responder ao erro:", replyError);
      });
    }
  };
}
