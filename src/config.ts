import "dotenv/config";

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  return value;
}

function intEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`${key} precisa ser um número (recebido "${raw}")`);
  return value;
}

export const config = {
  discordToken: requiredEnv("DISCORD_TOKEN"),
  prefix: process.env.PREFIX || "!",
  disabledModules: new Set(
    (process.env.DISABLED_MODULES ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  ),

  lavalink: {
    host: process.env.LAVALINK_HOST || "localhost",
    port: intEnv("LAVALINK_PORT", 2333),
    password: process.env.LAVALINK_PASSWORD || "",
  },

  voice: {
    /** Sai do canal quando não sobra ninguém (além de bots) por esse tempo */
    leaveOnEmptyMs: 30_000,
    /** Sai do canal quando a fila acaba e nada novo é pedido por esse tempo */
    leaveOnQueueEndMs: 60_000,
  },

  media: {
    port: intEnv("MEDIA_PORT", 3001),
    publicUrl: (process.env.MEDIA_PUBLIC_URL || "http://host.docker.internal:3001").replace(/\/+$/, ""),
  },

  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
  },
} as const;

export type Config = typeof config;
