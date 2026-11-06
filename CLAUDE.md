# jooj-bot

Bot geral do Discord (discord.js 14, TypeScript, Node 24), organizado em módulos independentes.
Música e TTS são tocados por um servidor **Lavalink** separado, rodando no Docker.

**Antes de começar qualquer tarefa, leia as últimas entradas de `docs/devlog.md`** (estado atual,
problemas conhecidos, pendências). Decisões de arquitetura e o motivo de cada uma estão em `docs/decisions.md`.

## Arquitetura

- `src/core/`: interface `BotModule`, `loader.ts` (carrega os módulos e cria só os serviços que eles
  pedem; uma falha desativa só o módulo afetado), dispatcher de comandos com prefixo, logger, embeds.
- `src/services/`: serviços compartilhados, declarados pelos módulos em `requires`.
  - `voice/lavalink.ts`: dono único das conexões de voz (uma por servidor).
  - `media/server.ts`: HTTP interno que serve o áudio gerado (TTS) para o Lavalink baixar.
- `src/modules/<nome>/`: cada funcionalidade. Registre novos módulos em `src/modules/index.ts`.
- `lavalink/application.yml` + `docker-compose.yml`: Lavalink 4 com o plugin youtube-source.

## Convenções

- Módulos **não importam uns aos outros**. Usam só `core/` e os serviços via `ctx.service(...)`.
- Mensagens para o usuário em português (PT-BR). Comandos com prefixo `!`.
- Trabalho e commits na branch `develop`. `main` recebe por PR.
- Nunca commitar `.env`. Variável nova vai também para `.env.example`.
- Verificar com `npx tsc --noEmit`. Ainda não há testes automatizados.

## Rodando (WSL2 + Docker Engine)

```bash
docker compose up -d lavalink    # espere "Lavalink is ready" em: docker compose logs -f lavalink
npm run dev
```

Se o docker der "permission denied" num terminal aberto antes do usuário entrar no grupo `docker`,
use `sg docker -c "docker compose ..."`. O usuário testa os comandos no próprio Discord. Não rode
duas instâncias do bot ao mesmo tempo, senão os dois respondem a cada comando.

## Registro de progresso (obrigatório)

Ao concluir uma tarefa, resolver um problema ou tomar uma decisão:
1. Acrescente uma entrada no **topo** de `docs/devlog.md`, no formato descrito lá: data, o que foi
   feito, por quê, problemas e soluções, pendências, commits.
2. Se mudou a arquitetura ou uma decisão importante, acrescente um item em `docs/decisions.md`.
3. Atualize a seção "Estado atual" do devlog se as pendências mudaram.
