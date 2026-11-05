const timestamp = () => new Date().toISOString();

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  /** Logger com prefixo fixo, ex.: logger.child("music") -> "[music] ..." */
  child(scope: string): Logger;
}

function createLogger(prefix = ""): Logger {
  const fmt = (message: string) => `${prefix}${message}`;
  return {
    info: (message, ...args) => console.log(`[${timestamp()}] INFO: ${fmt(message)}`, ...args),
    warn: (message, ...args) => console.warn(`[${timestamp()}] WARN: ${fmt(message)}`, ...args),
    error: (message, ...args) => console.error(`[${timestamp()}] ERROR: ${fmt(message)}`, ...args),
    debug: (message, ...args) => {
      if (process.env.DEBUG) console.debug(`[${timestamp()}] DEBUG: ${fmt(message)}`, ...args);
    },
    child: (scope) => createLogger(`${prefix}[${scope}] `),
  };
}

export const logger = createLogger();
