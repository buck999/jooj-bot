import { Readable } from "stream";
import { config } from "../../config";
import { logger } from "../../utils/logger";

const BASE_URL = "https://api.elevenlabs.io/v1";

export async function generateSpeech(text: string): Promise<Buffer> {
  if (!config.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY não configurada.");
  }

  const url = `${BASE_URL}/text-to-speech/${config.elevenLabsVoiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": config.elevenLabsApiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`ElevenLabs API error (${response.status}): ${errorBody}`);
    throw new Error(`ElevenLabs API retornou ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function bufferToReadable(buffer: Buffer): Readable {
  return Readable.from(buffer);
}
