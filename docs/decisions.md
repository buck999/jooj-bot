# Decisões de arquitetura

Cada item: **contexto → decisão → consequências**. Itens novos no fim, com data.

## 1. Áudio no Lavalink, não no processo do bot (2026-11-05)
**Contexto:** com discord-player e um extractor próprio, o primeiro áudio levava ~30 s e havia cortes,
aceleração e lentidão. O envio de pacotes a cada 20 ms dividia o event loop do Node com JSDOM, BotGuard e
o parse do SABR.
**Decisão:** usar o Lavalink 4 (Java, no Docker) com o plugin youtube-source, e o `lavalink-client` no bot.
**Consequências:** o bot não processa áudio; o envio tem buffer nativo (JDA-NAS) e o servidor fica sempre
aquecido (~2 s até tocar). Em troca, há um processo a mais para rodar (Docker, ~300–500 MB de RAM) e os
bloqueios do YouTube passam a ser resolvidos atualizando o plugin, não o código do bot.

## 2. Módulos independentes com serviços compartilhados (2026-11-05)
**Contexto:** o bot vai ganhar várias funcionalidades além de música.
**Decisão:** cada funcionalidade é um `BotModule` em `src/modules/<nome>/`, que declara os comandos e os
serviços de que precisa (`requires`). Módulos não importam uns aos outros. O loader desativa só o módulo
que falhar, e `DISABLED_MODULES` desliga módulos sem mexer no código.
**Consequências:** adicionar uma funcionalidade é criar uma pasta e registrá-la em `src/modules/index.ts`.
O que for comum a vários módulos vira serviço em `src/services/`.

## 3. Voz como serviço compartilhado (2026-11-05)
**Contexto:** o Discord permite uma conexão de voz por servidor, e tanto a música quanto o TTS precisam dela.
**Decisão:** `services/voice` é o dono único do `LavalinkManager` e das regras de saída do canal (vazio por
30 s; fila vazia por 60 s). Faixas com `userData.silent` não são anunciadas pelo módulo de música.
**Consequências:** o Lavalink não mistura duas faixas, então TTS e música dividem a mesma fila (ver item 6).

## 4. TTS tocado pelo Lavalink via servidor HTTP interno (2026-11-05)
**Contexto:** o áudio do ElevenLabs é gerado no bot, mas quem toca é o Lavalink.
**Decisão:** `services/media` guarda o MP3 em memória com um ID aleatório e TTL de 10 min, e o serve em
`MEDIA_PUBLIC_URL/media/<id>.mp3`. O Lavalink toca essa URL pela fonte `http`.
**Consequências:** `MEDIA_PUBLIC_URL` precisa ser o endereço do bot visto pelo Lavalink:
`http://host.docker.internal:3001` com o bot no host, ou `http://bot:3001` com os dois no compose.

## 5. youtube-source em snapshot (2026-11-05)
**Contexto:** no release 1.18.2, o YouTube bloqueava todos os clientes configurados ("requires login",
"not a bot", só SABR).
**Decisão:** usar o snapshot `2be8e542` do `main`, que corrige os clientes TV, ANDROID e IOS.
**Consequências:** um snapshot pode quebrar sem aviso. Volte para um release estável assim que sair um
maior que 1.18.2. O plano B contra bloqueios é o OAuth com uma conta descartável.

## 6. TTS na fila logo após a faixa atual, no plano gratuito do ElevenLabs (2026-11-06)
**Contexto:** antes, o TTS era recusado com música tocando, e as piadas não podem esperar a playlist inteira.
O desenvolvimento usa o plano gratuito do ElevenLabs.
**Decisão:** o TTS entra na fila logo após a faixa atual, depois de outros TTS já esperando (ordem de chegada).
O modelo é o `eleven_flash_v2_5` (0,5 crédito/caractere, aceita `language_code`), com o idioma definido pelo
apelido da voz. São só vozes premade, porque o plano gratuito recusa vozes da Library pela API
(`paid_plan_required`), e o limite é de 300 caracteres por mensagem.
**Consequências:** as vozes têm sotaque estrangeiro falando PT. Vozes brasileiras de verdade e tags de emoção
(`eleven_v3`) exigem o plano pago e são a próxima fase. O áudio fica até 2 h no servidor de mídia, porque pode
esperar uma música longa terminar.
