import type { Player, Track, UnresolvedTrack } from "lavalink-client";
import { errorEmbed, infoEmbed } from "../../core/embeds";
import type { BotContext, BotModule, Command } from "../../core/module";
import { SILENT_TRACK_KEY, VoiceUnavailableError } from "../../services/voice/lavalink";
import { ElevenLabsError, generateSpeech } from "./elevenlabs";
import { MAX_TEXT_LENGTH, parseTtsInput } from "./parse";
import { DEFAULT_VOICE, voiceList } from "./voices";

/** Marca a faixa como TTS e guarda o ID do áudio no servidor de mídia */
const TTS_TRACK_KEY = "tts";
const MEDIA_ID_KEY = "tts:mediaId";

/** O TTS pode esperar uma música longa terminar antes de tocar */
const MEDIA_TTL_MS = 2 * 60 * 60 * 1000;

type AnyTrack = Track | UnresolvedTrack | null | undefined;

const isTtsTrack = (track: AnyTrack): boolean => !!track?.userData?.[TTS_TRACK_KEY];

const ttsCommand: Command = {
  name: "tts",
  aliases: ["falar", "speak"],
  description: "Fala um texto no canal de voz: !tts <voz>: <texto>",

  async execute(message, _args, ctx) {
    const prefix = ctx.config.prefix;
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    // Texto bruto (sem o "!tts"), para manter quebras de linha e pontuação
    const raw = message.content.slice(prefix.length).replace(/^\s*\S+/, "");
    const parsed = parseTtsInput(raw, message);
    if (!parsed.ok) {
      const usage = `Uso: \`${prefix}tts <voz>: <texto>\` (ex.: \`${prefix}tts ${DEFAULT_VOICE}: olá bom dia\`)`;
      const reasons = {
        empty: usage,
        too_long: `Texto muito longo (${parsed.length}/${MAX_TEXT_LENGTH} caracteres).`,
        unknown_voice: `Não conheço a voz \`${parsed.alias}\`. Vozes disponíveis:\n${voiceList()}`,
      };
      await message.reply({ embeds: [errorEmbed(reasons[parsed.reason])] });
      return;
    }

    const voice = ctx.service("voice");
    const existing = voice.getPlayer(message.guildId);
    if (existing && existing.voiceChannelId !== voiceChannel.id) {
      if (existing.queue.current) {
        await message.reply({ embeds: [errorEmbed(`Já estou tocando em <#${existing.voiceChannelId}>.`)] });
        return;
      }
      // Player parado em outro canal: recomeça no canal de quem pediu
      await existing.destroy("mudança de canal");
    }

    await message.channel.sendTyping().catch(() => {});

    let audio: Buffer;
    try {
      audio = await generateSpeech(parsed.text, {
        apiKey: ctx.config.elevenLabs.apiKey,
        voiceId: parsed.voice.id,
        language: parsed.voice.language,
      });
    } catch (error) {
      if (!(error instanceof ElevenLabsError)) throw error;
      ctx.logger.error(error.message);
      await message.reply({ embeds: [errorEmbed(error.userMessage)] });
      return;
    }

    const media = ctx.service("media");
    const published = media.publish(audio, "audio/mpeg", MEDIA_TTL_MS);

    let player: Player;
    try {
      player = await voice.join({
        guildId: message.guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channelId,
      });
    } catch (error) {
      media.remove(published.id);
      if (error instanceof VoiceUnavailableError) {
        await message.reply({ embeds: [errorEmbed(error.message)] });
        return;
      }
      throw error;
    }

    const result = await player.search({ query: published.url }, message.author);
    const track = result.tracks[0];
    if (!track) {
      ctx.logger.error(`Lavalink não carregou o áudio em ${published.url}:`, result.exception);
      await message.reply({
        embeds: [errorEmbed("O servidor de áudio não conseguiu baixar o TTS. Confira MEDIA_PUBLIC_URL no .env.")],
      });
      media.remove(published.id);
      if (!player.queue.current) await player.destroy("tts falhou");
      return;
    }

    // Faixa "silenciosa": o módulo de música não anuncia "tocando agora" para ela
    track.info.title = `🔊 ${parsed.alias}: ${parsed.text.slice(0, 80)}`;
    track.userData = {
      ...track.userData,
      [SILENT_TRACK_KEY]: 1,
      [TTS_TRACK_KEY]: 1,
      [MEDIA_ID_KEY]: published.id,
    };

    if (player.queue.current) {
      // Logo após a faixa atual, mas depois de outros TTS já esperando (ordem de chegada)
      const waiting = player.queue.tracks.findIndex((queued) => !isTtsTrack(queued));
      const index = waiting === -1 ? player.queue.tracks.length : waiting;
      await player.queue.add(track, index);
      await message.reply({ embeds: [infoEmbed("🔊 Na fila: toco assim que a faixa atual acabar.")] });
      return;
    }

    await player.queue.add(track);
    await player.play();
    await message.reply({ embeds: [infoEmbed("🔊 Falando...")] });
  },
};

const voicesCommand: Command = {
  name: "vozes",
  aliases: ["voices"],
  description: "Lista as vozes do !tts",

  async execute(message, _args, ctx) {
    const prefix = ctx.config.prefix;
    await message.reply({
      embeds: [
        infoEmbed(
          `**Vozes do TTS**\n${voiceList()}\n\n` +
            `Uso: \`${prefix}tts <voz>: <texto>\`, ex.: \`${prefix}tts vozmulher1: que reunião produtiva, hein\`\n` +
            `Sem voz, uso \`${DEFAULT_VOICE}\`. Máximo de ${MAX_TEXT_LENGTH} caracteres.`,
        ),
      ],
    });
  },
};

function registerTtsEvents(ctx: BotContext): void {
  const manager = ctx.service("voice").manager;
  const media = ctx.service("media");

  const release = (track: AnyTrack) => {
    const id = track?.userData?.[MEDIA_ID_KEY];
    if (typeof id === "string") media.remove(id);
  };

  manager.on("trackEnd", (_player, track) => {
    if (isTtsTrack(track)) release(track);
  });

  manager.on("trackError", (player, track, payload) => {
    if (!isTtsTrack(track)) return;
    release(track);
    ctx.logger.error(`Erro ao tocar TTS "${track?.info.title ?? "?"}":`, payload.exception);
    const channel = player.textChannelId ? ctx.client.channels.cache.get(player.textChannelId) : undefined;
    if (channel?.isSendable()) {
      channel
        .send({ embeds: [errorEmbed("Não consegui tocar um TTS da fila.")] })
        .catch((error) => ctx.logger.debug("Falha ao enviar mensagem:", error));
    }
  });
}

export const ttsModule: BotModule = {
  name: "tts",
  description: "Texto para fala com ElevenLabs",
  requires: ["voice", "media"],
  commands: [ttsCommand, voicesCommand],
  init(ctx) {
    if (!ctx.config.elevenLabs.apiKey) throw new Error("ELEVENLABS_API_KEY não configurada");
    registerTtsEvents(ctx);
  },
};
