import type { Message } from "discord.js";
import { DEFAULT_VOICE, VOICES, type VoicePreset } from "./voices";

/** Limite por mensagem, para poupar os créditos do plano gratuito */
export const MAX_TEXT_LENGTH = 300;

export type ParseResult =
  | { ok: true; alias: string; voice: VoicePreset; text: string }
  | { ok: false; reason: "empty" | "too_long" | "unknown_voice"; alias?: string; length?: number };

const VOICE_PREFIX = /^([\p{L}\d_-]+)\s*:\s*([\s\S]*)$/u;

/**
 * Interpreta o texto depois de `!tts`: `<apelido>: <texto>` ou só `<texto>`
 * (voz padrão). Uma palavra solta antes de ":" que não é apelido conta como
 * erro de digitação, para não ler "vozhomen1" em voz alta.
 */
export function parseTtsInput(raw: string, message: Message<true>): ParseResult {
  let alias = DEFAULT_VOICE;
  let body = raw.trim();

  const match = VOICE_PREFIX.exec(body);
  if (match) {
    const candidate = match[1].toLowerCase();
    if (!VOICES[candidate]) return { ok: false, reason: "unknown_voice", alias: match[1] };
    alias = candidate;
    body = match[2];
  }

  const text = cleanDiscordText(body, message);
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, reason: "too_long", length: text.length };

  return { ok: true, alias, voice: VOICES[alias], text };
}

/** Troca a sintaxe do Discord por algo que soe natural lido em voz alta */
function cleanDiscordText(text: string, message: Message<true>): string {
  return text
    .replace(/<@!?(\d+)>/g, (_, id: string) => {
      const member = message.mentions.members?.get(id) ?? message.guild.members.cache.get(id);
      return member?.displayName ?? message.mentions.users.get(id)?.displayName ?? "alguém";
    })
    .replace(/<@&(\d+)>/g, (_, id: string) => message.guild.roles.cache.get(id)?.name ?? "")
    .replace(/<#(\d+)>/g, (_, id: string) => message.guild.channels.cache.get(id)?.name ?? "")
    .replace(/<a?:\w+:\d+>/g, "")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/[*_~`|>]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
