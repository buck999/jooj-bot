export type VoiceLanguage = "pt" | "en";

export interface VoicePreset {
  /** ID da voz no ElevenLabs */
  readonly id: string;
  /** Idioma forçado na geração (`language_code`) */
  readonly language: VoiceLanguage;
  /** Descrição curta mostrada no `!vozes` */
  readonly label: string;
}

/**
 * Apelidos usados em `!tts <apelido>: <texto>`. Só vozes "premade": no plano
 * gratuito a API recusa vozes da Voice Library (erro `paid_plan_required`).
 * As premade são americanas/britânicas, mas falam PT-BR com `language_code: "pt"`.
 */
export const VOICES: Readonly<Record<string, VoicePreset>> = {
  vozhomem1: { id: "TX3LPaxmHKxFdv7VOQHJ", language: "pt", label: "Homem jovem, animado (Liam)" },
  vozhomem2: { id: "N2lVS1w4EtoT3dr4eOWO", language: "pt", label: "Homem rouco, malandro (Callum)" },
  vozmulher1: { id: "FGY2WhTYpPnrIDTdsKH5", language: "pt", label: "Mulher jovem, debochada (Laura)" },
  vozmulher2: { id: "cgSgspJ2msm6clMCkdW9", language: "pt", label: "Mulher jovem, brincalhona (Jessica)" },
  manvoice1: { id: "CwhRBWXzGAHq8TQ4Fs17", language: "en", label: "Man, laid-back (Roger)" },
  womanvoice1: { id: "EXAVITQu4vr4xnSDxMaL", language: "en", label: "Woman, confident (Sarah)" },
};

export const DEFAULT_VOICE = "vozhomem1";

const LANGUAGE_NAMES: Record<VoiceLanguage, string> = { pt: "PT-BR", en: "Inglês" };

/** Lista em texto para embeds (`!vozes` e erros de voz desconhecida) */
export function voiceList(): string {
  return Object.entries(VOICES)
    .map(([alias, voice]) => `\`${alias}\` · ${LANGUAGE_NAMES[voice.language]} · ${voice.label}`)
    .join("\n");
}
