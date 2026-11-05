const BASE_URL = "https://api.elevenlabs.io/v1";

export interface ElevenLabsOptions {
  apiKey: string;
  voiceId: string;
}

/** Gera fala em MP3 via ElevenLabs */
export async function generateSpeech(text: string, { apiKey, voiceId }: ElevenLabsOptions): Promise<Buffer> {
  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ElevenLabs retornou ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
