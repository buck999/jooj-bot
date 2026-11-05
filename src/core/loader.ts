import { Client, Collection } from "discord.js";
import type { Config } from "../config";
import { logger } from "./logger";
import type { BotContext, BotModule, Command, ServiceName, Services } from "./module";

/** Ciclo de vida comum aos serviços compartilhados */
export interface Service {
  /** Chamado no clientReady (o client já tem `user`) */
  start(): Promise<void>;
  stop(): Promise<void>;
}

type ServiceFactories = { [K in ServiceName]: (client: Client, config: Config) => Services[K] & Service };

export interface LoadedBot {
  readonly commands: Collection<string, { command: Command; ctx: BotContext }>;
  readonly modules: readonly string[];
  startServices(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Carrega os módulos habilitados, cria só os serviços que eles pedem e monta o
 * registro de comandos. Falha em um módulo (ou num serviço) desativa apenas os
 * módulos afetados; o resto do bot continua funcionando.
 */
export async function loadModules(
  client: Client,
  config: Config,
  allModules: readonly BotModule[],
  factories: ServiceFactories,
): Promise<LoadedBot> {
  const enabled = allModules.filter((mod) => {
    if (config.disabledModules.has(mod.name)) {
      logger.info(`Módulo "${mod.name}" desativado via DISABLED_MODULES`);
      return false;
    }
    return true;
  });

  // Cria cada serviço uma vez, e só se algum módulo habilitado precisar dele
  const services = new Map<ServiceName, Service>();
  const failedServices = new Set<ServiceName>();
  const needed = new Set(enabled.flatMap((mod) => mod.requires ?? []));
  for (const name of needed) {
    try {
      services.set(name, factories[name](client, config));
    } catch (error) {
      failedServices.add(name);
      logger.error(`Falha ao criar o serviço "${name}":`, error);
    }
  }

  const commands = new Collection<string, { command: Command; ctx: BotContext }>();
  const active: BotModule[] = [];

  for (const mod of enabled) {
    const missing = (mod.requires ?? []).filter((name) => failedServices.has(name));
    if (missing.length > 0) {
      logger.error(`Módulo "${mod.name}" desativado: serviço(s) indisponível(is): ${missing.join(", ")}`);
      continue;
    }

    const ctx: BotContext = {
      client,
      config,
      logger: logger.child(mod.name),
      service: (name) => {
        if (!mod.requires?.includes(name)) {
          throw new Error(`Módulo "${mod.name}" usou o serviço "${name}" sem declará-lo em requires`);
        }
        return services.get(name) as unknown as Services[typeof name];
      },
    };

    try {
      await mod.init?.(ctx);
    } catch (error) {
      logger.error(`Módulo "${mod.name}" desativado: erro no init:`, error);
      continue;
    }

    for (const command of mod.commands ?? []) {
      for (const key of [command.name, ...(command.aliases ?? [])]) {
        const existing = commands.get(key);
        if (existing) {
          logger.warn(`Comando "${key}" de "${mod.name}" ignorado: já registrado por "${existing.command.name}"`);
          continue;
        }
        commands.set(key, { command, ctx });
      }
    }

    active.push(mod);
    logger.info(`Módulo "${mod.name}" carregado (${mod.commands?.length ?? 0} comando(s))`);
  }

  return {
    commands,
    modules: active.map((mod) => mod.name),

    async startServices() {
      for (const [name, service] of services) {
        try {
          await service.start();
        } catch (error) {
          logger.error(`Falha ao iniciar o serviço "${name}":`, error);
        }
      }
    },

    async shutdown() {
      for (const mod of active) {
        await Promise.resolve(mod.shutdown?.()).catch((error) =>
          logger.error(`Erro no shutdown de "${mod.name}":`, error),
        );
      }
      for (const [name, service] of services) {
        await service.stop().catch((error) => logger.error(`Erro ao parar o serviço "${name}":`, error));
      }
    },
  };
}
