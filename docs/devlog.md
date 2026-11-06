# Diário de desenvolvimento

Registro cronológico do que foi feito, por quê, quais problemas apareceram e como foram resolvidos.
**A entrada mais nova fica no topo.** Formato:

```
## AAAA-MM-DD — Título
**Feito:** …
**Por quê:** …
**Problemas → solução:** …
**Pendências:** …
**Commits:** hash(es)
```

## Estado atual

- Áudio rodando via Lavalink (Docker) com o plugin youtube-source em **snapshot** (`2be8e54`).
- Tempo do comando até o áudio começar: **~1,8 s** (antes ~30 s).
- Ambiente: WSL2 (Ubuntu 24.04) com Docker Engine, no mesmo PC Windows usado para testar no Discord.
- Pendências:
  - [ ] Testar playlist, `!skip`, `!pause`/`!resume`, `!tts`, e a saída automática com canal vazio (30 s) e com fila vazia (60 s).
  - [ ] Ouvir uma faixa longa (10+ min) e conferir se aparece o aviso de perda de frames no log.
  - [ ] Voltar o youtube-source para um release quando sair um maior que 1.18.2.
  - [ ] Se o YouTube voltar a bloquear: ativar o OAuth com uma conta descartável (passo a passo no README).
  - [ ] Decidir a hospedagem: VPS da Hostinger ou um PC próprio.
  - [ ] Decidir o que fazer com o `git stash` do extractor antigo (pode ser descartado).

---

## 2026-11-05 — Registro de contexto entre sessões
**Feito:** criados `CLAUDE.md` (contexto lido em toda sessão), este devlog e `docs/decisions.md`.
**Por quê:** uma queda de energia interrompeu a sessão anterior. A conversa não se perdeu (dá para retomar
com `claude --resume`), mas faltava um resumo legível e versionado do progresso, que acompanhe o projeto
em outras máquinas.
**Problemas → solução:** nenhum.
**Pendências:** manter este arquivo atualizado ao fim de cada tarefa (regra no `CLAUDE.md`).
**Commits:** (este commit)

## 2026-11-05 — YouTube bloqueando reprodução → snapshot do youtube-source
**Feito:** troca do youtube-source 1.18.2 pelo snapshot `2be8e542` do `main`. Clientes passaram a ser
MUSIC, ANDROID, ANDROID_VR, IOS, TVHTML5_SIMPLY, WEB, WEBEMBEDDED.
**Por quê:** no 1.18.2 a faixa carregava, mas todos os clientes falharam ao tocar: ANDROID_VR "requires
login", WEB só devolvia SABR ("No supported audio streams"), WEBEMBEDDED "unavailable", TVHTML5_SIMPLY
"Sign in to confirm you're not a bot". O `main` tem correções ainda sem release: User-Agent do TV (#233),
versão do ANDROID (#231) e IOS tocável.
**Problemas → solução:** resolvido; o usuário confirmou que tocou perfeitamente. Se voltar a bloquear, o
plano B é o OAuth com uma conta descartável.
**Commits:** 3173c3d

## 2026-11-05 — Reescrita do áudio com Lavalink + arquitetura modular
**Feito:** reescrita completa. Saíram discord-player, discord-voip, youtubei.js, googlevideo, bgutils-js,
jsdom, ffmpeg e opus. Entraram Lavalink 4.2.2 no Docker e `lavalink-client` 2.11 no bot. Estrutura nova:
`core/` (módulos e loader), `services/voice` e `services/media`, `modules/music` e `modules/tts`. Logs de
diagnóstico: `Comando -> início do áudio: Xms` e aviso quando o Lavalink perde mais de 1% dos frames.
**Por quê:** os dois problemas vinham da arquitetura, não de um bug:
1. **~30 s para começar:** cada play passava por Innertube, geração de PO token (BotGuard dentro do JSDOM),
   decipher e início do SABR, além da rede lenta do WSL2.
2. **Cortes, aceleração e lentidão:** o Discord espera um pacote Opus a cada 20 ms, e eles eram enviados
   pelo mesmo event loop do Node que rodava JSDOM, BotGuard e o parse do SABR. O Lavalink resolve isso com
   o JDA-NAS, que mantém um buffer nativo de 400 ms fora da JVM. Bots grandes usam esse padrão.
O usuário quer um bot geral, com várias funcionalidades, então cada uma virou um módulo independente.
**Problemas → solução:**
- Docker não estava instalado → Docker Engine instalado dentro do WSL2 (`get.docker.com`). O aviso do
  script recomendando o Docker Desktop pode ser ignorado.
- "permission denied" no docker.sock → usuário adicionado ao grupo `docker`. Em terminais já abertos,
  usar `sg docker -c ...`.
- O TTS depende de o Lavalink alcançar o bot: confirmado que `host.docker.internal:3001` funciona a partir
  do container (graças ao `extra_hosts: host-gateway`).
**Resultado medido:** 2,4 s (1º teste) e 1,8 s (após o snapshot) do comando até o áudio.
**Commits:** 3173c3d

## 2026-11-05 — Sessão anterior: extractor próprio do YouTube (abandonado)
**Feito:** primeiro bot rodando e conectado ao Discord como `jooj bot#6360`. Depois, tentativa de corrigir
a demora com um extractor próprio (youtubei.js + SABR + PO token em cache, pré-busca da próxima faixa,
Opus direto sem FFmpeg).
**Problemas → solução:**
- Bot invisível no servidor "J o o J" → permissão: `@everyone` sem "Ver canal" e cargo do bot sem acesso.
  No servidor de teste, o convite não tinha o escopo `bot`.
- Bot entrava na call sem tocar: (1) pedido de áudio "HIGH", que o YouTube não oferece → passou a pegar o
  Opus de maior bitrate; (2) bug do discord-player 7.2.0, que marcava Opus como PCM cru → contornado com
  `onAfterCreateStream`.
- A sessão foi interrompida por uma queda de energia antes do commit. Na sessão seguinte, a abordagem foi
  abandonada em favor do Lavalink. O código ficou guardado no `git stash`
  ("extractor youtube proprio (antes da reescrita Lavalink)").
**Commits:** nenhum (só stash).

## Antes de 2026-11-05 — Início do projeto
**Feito:** setup com player de música e TTS (ElevenLabs); troca do player por discord-player.
**Commits:** 6213e81, db7a153, 4d2c0e9
