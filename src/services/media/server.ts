import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { Config } from "../../config";
import type { Service } from "../../core/loader";
import { logger as rootLogger } from "../../core/logger";

const logger = rootLogger.child("media");

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

interface MediaEntry {
  data: Buffer;
  contentType: string;
  expiresAt: number;
}

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

/**
 * Servidor HTTP interno que expõe áudio gerado em memória (ex.: TTS) por uma
 * URL temporária com ID aleatório, para o Lavalink tocar via fonte "http".
 */
export class MediaServer implements Service {
  readonly #config: Config;
  readonly #entries = new Map<string, MediaEntry>();
  #server: Server | null = null;
  #sweeper: NodeJS.Timeout | null = null;

  constructor(_client: unknown, config: Config) {
    this.#config = config;
  }

  async start(): Promise<void> {
    this.#server = createServer((req, res) => {
      const id = req.method === "GET" || req.method === "HEAD" ? req.url?.match(/^\/media\/([\w-]+)/)?.[1] : undefined;
      const entry = id ? this.#entries.get(id) : undefined;

      if (!entry || entry.expiresAt < Date.now()) {
        res.writeHead(404).end();
        return;
      }

      res.writeHead(200, { "Content-Type": entry.contentType, "Content-Length": entry.data.length });
      res.end(req.method === "HEAD" ? undefined : entry.data);
    });

    await new Promise<void>((resolve, reject) => {
      this.#server!.once("error", reject).listen(this.#config.media.port, "0.0.0.0", () => resolve());
    });

    this.#sweeper = setInterval(() => this.#sweep(), SWEEP_INTERVAL_MS).unref();
    logger.info(`Servindo mídia na porta ${this.#config.media.port} (URL pública: ${this.#config.media.publicUrl})`);
  }

  async stop(): Promise<void> {
    if (this.#sweeper) clearInterval(this.#sweeper);
    this.#entries.clear();
    await new Promise<void>((resolve) => (this.#server ? this.#server.close(() => resolve()) : resolve()));
    this.#server = null;
  }

  /** Guarda o conteúdo e devolve a URL pela qual o Lavalink consegue baixá-lo */
  publish(data: Buffer, contentType: string, ttlMs = DEFAULT_TTL_MS): { id: string; url: string } {
    if (!this.#server) throw new Error("MediaServer não iniciado");
    const id = randomUUID();
    this.#entries.set(id, { data, contentType, expiresAt: Date.now() + ttlMs });
    const ext = EXTENSIONS[contentType] ?? "bin";
    return { id, url: `${this.#config.media.publicUrl}/media/${id}.${ext}` };
  }

  remove(id: string): void {
    this.#entries.delete(id);
  }

  #sweep(): void {
    const now = Date.now();
    for (const [id, entry] of this.#entries) {
      if (entry.expiresAt < now) this.#entries.delete(id);
    }
  }
}
