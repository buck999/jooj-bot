import { Message } from "discord.js";
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  NoSubscriberBehavior,
} from "discord-voip";
import { useQueue } from "discord-player";
import { Command } from "../../types";
import { generateSpeech, bufferToReadable } from "../../services/tts/elevenlabs";
import { errorEmbed, successEmbed } from "../../utils/embeds";
import { logger } from "../../utils/logger";

export const ttsCommand: Command = {
  name: "tts",
  aliases: ["falar", "speak"],
  description: "Gera áudio TTS via ElevenLabs e toca no canal de voz",

  async execute(message: Message, args: readonly string[]): Promise<void> {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      await message.reply({ embeds: [errorEmbed("Você precisa estar em um canal de voz.")] });
      return;
    }

    const text = args.join(" ");
    if (!text) {
      await message.reply({ embeds: [errorEmbed("Uso: `!tts <texto>`")] });
      return;
    }

    if (text.length > 5000) {
      await message.reply({ embeds: [errorEmbed("Texto muito longo (máximo 5000 caracteres).")] });
      return;
    }

    if (useQueue(message.guildId!)?.isPlaying()) {
      await message.reply({ embeds: [errorEmbed("Tem música tocando agora, use `!stop` antes do TTS.")] });
      return;
    }

    await message.reply({ embeds: [successEmbed("Gerando áudio...")] });

    try {
      const audioBuffer = await generateSpeech(text);

      const guildId = message.guildId!;
      let connection = getVoiceConnection(guildId);
      if (!connection) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId,
          adapterCreator: message.guild!.voiceAdapterCreator,
        });
      }

      const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      });

      const readable = bufferToReadable(audioBuffer);
      const resource = createAudioResource(readable, {
        inputType: StreamType.Arbitrary,
      });

      connection.subscribe(player);
      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => {
        player.stop(true);
      });

      player.on("error", (error) => {
        logger.error("Erro no player TTS:", error);
        player.stop(true);
      });
    } catch (error) {
      logger.error("Erro ao gerar TTS:", error);
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      await message.reply({ embeds: [errorEmbed(`Erro ao gerar áudio: ${errorMsg}`)] });
    }
  },
};
