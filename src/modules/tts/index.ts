import { errorEmbed, infoEmbed } from "../../core/embeds";
import type { BotModule, Command } from "../../core/module";
import { SILENT_TRACK_KEY, VoiceUnavailableError } from "../../services/voice/lavalink";
import { generateSpeech } from "./elevenlabs";

const MAX_TEXT_LENGTH = 5000;

const ttsCommand: Command = {
  name: "tts",
  aliases: ["falar", "speak"],
  description: "Gera áudio TTS via ElevenLabs e toca no canal de voz",

  async execute(message, args, ctx) {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const text = args.join(" ");
    if (!text) {
      await message.reply({ embeds: [errorEmbed(`Uso: \`${ctx.config.prefix}tts <texto>\``)] });
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      await message.reply({ embeds: [errorEmbed(`Texto muito longo (máximo ${MAX_TEXT_LENGTH} caracteres).`)] });
      return;
    }

    const voice = ctx.service("voice");
    const existing = voice.getPlayer(message.guildId);
    if (existing?.queue.current) {
      await message.reply({ embeds: [errorEmbed("Já tem áudio tocando. Espere terminar ou use `!stop`.")] });
      return;
    }
    if (existing && existing.voiceChannelId !== voiceChannel.id) {
      await existing.destroy("mudança de canal");
    }

    await message.channel.sendTyping().catch(() => {});

    const audio = await generateSpeech(text, ctx.config.elevenLabs);
    const media = ctx.service("media").publish(audio, "audio/mpeg");

    let player;
    try {
      player = await voice.join({
        guildId: message.guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channelId,
      });
    } catch (error) {
      ctx.service("media").remove(media.id);
      if (error instanceof VoiceUnavailableError) {
        await message.reply({ embeds: [errorEmbed(error.message)] });
        return;
      }
      throw error;
    }

    const result = await player.search({ query: media.url }, message.author);
    const track = result.tracks[0];
    if (!track) {
      ctx.logger.error(`Lavalink não carregou o áudio em ${media.url}:`, result.exception);
      await message.reply({
        embeds: [errorEmbed("O servidor de áudio não conseguiu baixar o TTS. Confira MEDIA_PUBLIC_URL no .env.")],
      });
      ctx.service("media").remove(media.id);
      return;
    }

    // Faixa "silenciosa": o módulo de música não anuncia "tocando agora" para ela
    track.info.title = `TTS: ${text.slice(0, 80)}`;
    track.userData = { ...track.userData, [SILENT_TRACK_KEY]: 1 };

    await player.queue.add(track);
    await player.play();
    await message.reply({ embeds: [infoEmbed("🔊 Falando...")] });
  },
};

export const ttsModule: BotModule = {
  name: "tts",
  description: "Texto para fala com ElevenLabs",
  requires: ["voice", "media"],
  commands: [ttsCommand],
  init(ctx) {
    if (!ctx.config.elevenLabs.apiKey) throw new Error("ELEVENLABS_API_KEY não configurada");
  },
};
