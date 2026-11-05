import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config";
import { createMessageHandler } from "./core/commands";
import { loadModules } from "./core/loader";
import { logger } from "./core/logger";
import { allModules } from "./modules";
import { MediaServer } from "./services/media/server";
import { VoiceService } from "./services/voice/lavalink";

async function main(): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  const bot = await loadModules(client, config, allModules, {
    voice: (c, cfg) => new VoiceService(c, cfg),
    media: (c, cfg) => new MediaServer(c, cfg),
  });

  client.once("clientReady", async (ready) => {
    await bot.startServices();
    logger.info(`Bot online como ${ready.user.tag} | módulos: ${bot.modules.join(", ") || "nenhum"}`);
  });
  client.on("messageCreate", createMessageHandler(bot, config.prefix));

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} recebido, desligando...`);
    await bot.shutdown();
    await client.destroy();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await client.login(config.discordToken);
}

process.on("unhandledRejection", (error) => logger.error("Promise rejeitada sem tratamento:", error));

main().catch((error) => {
  logger.error("Falha fatal na inicialização:", error);
  process.exit(1);
});
