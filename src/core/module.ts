import type { Client, Message } from "discord.js";
import type { Config } from "../config";
import type { Logger } from "./logger";
import type { MediaServer } from "../services/media/server";
import type { VoiceService } from "../services/voice/lavalink";

/**
 * Serviços compartilhados entre módulos. Só são criados se algum módulo
 * habilitado declarar que precisa deles em `requires`.
 */
export interface Services {
  voice: VoiceService;
  media: MediaServer;
}

export type ServiceName = keyof Services;

export interface BotContext {
  readonly client: Client;
  readonly config: Config;
  /** Logger com o nome do módulo como prefixo */
  readonly logger: Logger;
  /** Retorna um serviço declarado em `requires` (garantido pelo loader) */
  service<K extends ServiceName>(name: K): Services[K];
}

export interface Command {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly description: string;
  execute(message: Message<true>, args: readonly string[], ctx: BotContext): Promise<void>;
}

/**
 * Uma funcionalidade do bot (música, TTS, ...). Módulos não importam uns aos
 * outros: dependem só do core e dos serviços que declaram em `requires`.
 */
export interface BotModule {
  /** Identificador usado em logs e em DISABLED_MODULES */
  readonly name: string;
  readonly description: string;
  readonly requires?: readonly ServiceName[];
  readonly commands?: readonly Command[];
  /** Registra listeners/estado. Roda antes do login. Um erro aqui desativa só este módulo. */
  init?(ctx: BotContext): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}
