import type { BotModule } from "../core/module";
import { musicModule } from "./music";
import { ttsModule } from "./tts";

/** Para adicionar uma funcionalidade: crie modules/<nome>/index.ts e registre aqui. */
export const allModules: readonly BotModule[] = [musicModule, ttsModule];
