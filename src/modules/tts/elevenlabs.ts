import type { VoiceLanguage } from "./voices";

const BASE_URL = "https://api.elevenlabs.io/v1";

/** 0,5 crédito por caractere, baixa latência e aceita `language_code` */
const MODEL_ID = "eleven_flash_v2_5";
const OUTPUT_FORMAT = "mp3_44100_128";

export interface SpeechOptions {
  apiKey: string;
  voiceId: string;
  language: VoiceLanguage;
}

/** Erro do ElevenLabs com uma mensagem pronta para mostrar no Discord */
export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
  ) {
    super(message);
  }
}

/** Gera fala em MP3 via ElevenLabs */
export async function generateSpeech(text: string, { apiKey, voiceId, language }: SpeechOptions): Promise<Buffer> {
  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      language_code: language,
      // Estabilidade um pouco abaixo do padrão: entonação mais solta, combina com zoeira
      voice_settings: { stability: 0.4, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ElevenLabsError(
      `ElevenLabs retornou ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
      userMessageFor(response.status, body),
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

function userMessageFor(status: number, body: string): string {
  if (body.includes("quota_exceeded")) return "Os créditos do ElevenLabs deste mês acabaram.";
  if (body.includes("paid_plan_required")) return "Essa voz só funciona no plano pago do ElevenLabs.";
  if (body.includes("detected_unusual_activity")) {
    return "O ElevenLabs bloqueou o plano gratuito desta conta (atividade incomum, ex.: VPN).";
  }
  if (status === 401) return "A chave do ElevenLabs é inválida. Confira ELEVENLABS_API_KEY.";
  if (status === 429) return "Muitos pedidos de TTS ao mesmo tempo. Tente de novo em alguns segundos.";
  return "O ElevenLabs não conseguiu gerar o áudio. Tente de novo.";
}
