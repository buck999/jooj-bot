# jooj-bot

Bot geral do Discord, organizado em módulos independentes. O áudio (música e TTS) é feito por um
servidor [Lavalink](https://lavalink.dev) separado. O processo do bot só manda comandos, nenhum
áudio passa por ele. Por isso o som não corta quando o bot está ocupado com outras coisas.

## Rodando

Requisitos: Node 24+ e Docker (Docker Desktop com integração WSL, ou Docker Engine no Linux).

```bash
cp .env.example .env              # preencha DISCORD_TOKEN, LAVALINK_PASSWORD, ELEVENLABS_*
npm install

# desenvolvimento: Lavalink no Docker e bot no host
docker compose up -d lavalink
docker compose logs -f lavalink   # espere "Lavalink is ready to accept connections"
npm run dev

# produção (VPS / PC dedicado): sobe os dois serviços
docker compose up -d --build
```

### YouTube

O plugin [youtube-source](https://github.com/lavalink-devs/youtube-source) funciona sem login.
Se o YouTube começar a pedir "confirme que você não é um robô", ative o OAuth **com uma conta descartável**:

1. No `.env`, defina `YOUTUBE_OAUTH_ENABLED=true` e rode `docker compose up -d lavalink`.
2. Em `docker compose logs -f lavalink`, abra o link mostrado e digite o código.
3. Copie o refresh token que aparece no log para `YOUTUBE_REFRESH_TOKEN` no `.env`.
4. Adicione `TV` à lista `clients` em `lavalink/application.yml` e reinicie o Lavalink.

## Estrutura

```
src/
  index.ts              bootstrap
  config.ts             variáveis de ambiente
  core/                 interface de módulo, loader, dispatcher de comandos, logger, embeds
  services/
    voice/lavalink.ts   conexões de voz (compartilhado: uma por servidor)
    media/server.ts     HTTP interno que serve áudio gerado (TTS) para o Lavalink
  modules/
    music/              !play !skip !stop !pause !resume !np !queue
    tts/                !tts
lavalink/application.yml
```

### Criando um módulo

```ts
// src/modules/exemplo/index.ts
export const exemploModule: BotModule = {
  name: "exemplo",
  description: "...",
  requires: [],                 // serviços compartilhados: "voice", "media"
  commands: [/* Command[] */],
  init(ctx) { /* listeners, estado */ },
};
```

Registre o módulo em `src/modules/index.ts`. Para desligar módulos sem mexer no código, use
`DISABLED_MODULES=tts,exemplo`. Um módulo que falha no `init` é desativado sozinho, e o resto do bot continua.

## Diagnóstico de áudio

- O bot loga `Comando -> início do áudio: Xms` a cada `!play` que começa a tocar.
- A cada minuto o Lavalink manda estatísticas de envio. O bot avisa quando mais de 1% dos frames
  são nulos ou atrasados (`DEBUG=true` mostra todas). Se essa perda aparecer, o problema está na
  rede ou na máquina (ex.: WSL2), não no código. No WSL2, `networkingMode=mirrored` em
  `%UserProfile%\.wslconfig` costuma ajudar.
