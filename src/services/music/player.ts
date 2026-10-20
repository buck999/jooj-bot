import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import play from "play-dl";
import { logger } from "../../utils/logger";
import { getCurrentTrack, nextTrack, clearQueue } from "./queue";

const players = new Map<string, AudioPlayer>();

function getOrCreatePlayer(guildId: string): AudioPlayer {
  const existing = players.get(guildId);
  if (existing) return existing;

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
  });

  players.set(guildId, player);
  return player;
}

export async function playCurrentTrack(
  guildId: string,
  connection: VoiceConnection,
  onQueueEnd: () => void,
): Promise<void> {
  const track = getCurrentTrack(guildId);
  if (!track) {
    onQueueEnd();
    return;
  }

  const player = getOrCreatePlayer(guildId);
  connection.subscribe(player);

  try {
    const stream = await play.stream(track.url);
    const resource: AudioResource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    player.play(resource);

    player.removeAllListeners(AudioPlayerStatus.Idle);
    player.on(AudioPlayerStatus.Idle, () => {
      const next = nextTrack(guildId);
      if (next) {
        playCurrentTrack(guildId, connection, onQueueEnd);
      } else {
        onQueueEnd();
      }
    });

    player.removeAllListeners("error");
    player.on("error", (error) => {
      logger.error(`Erro no player (guild ${guildId}):`, error);
      const next = nextTrack(guildId);
      if (next) {
        playCurrentTrack(guildId, connection, onQueueEnd);
      } else {
        onQueueEnd();
      }
    });
  } catch (error) {
    logger.error(`Erro ao criar stream para ${track.url}:`, error);
    const next = nextTrack(guildId);
    if (next) {
      await playCurrentTrack(guildId, connection, onQueueEnd);
    } else {
      onQueueEnd();
    }
  }
}

export function pausePlayer(guildId: string): boolean {
  const player = players.get(guildId);
  if (!player) return false;
  return player.pause();
}

export function resumePlayer(guildId: string): boolean {
  const player = players.get(guildId);
  if (!player) return false;
  return player.unpause();
}

export function stopPlayer(guildId: string): void {
  const player = players.get(guildId);
  if (player) {
    player.stop(true);
    player.removeAllListeners();
    players.delete(guildId);
  }
  clearQueue(guildId);
}

export function skipCurrent(guildId: string): boolean {
  const player = players.get(guildId);
  if (!player) return false;
  return player.stop();
}

export function isPlaying(guildId: string): boolean {
  const player = players.get(guildId);
  return player?.state.status === AudioPlayerStatus.Playing;
}
