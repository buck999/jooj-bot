import { Track } from "../../types";

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  loop: boolean;
}

const queues = new Map<string, QueueState>();

function getOrCreate(guildId: string): QueueState {
  const existing = queues.get(guildId);
  if (existing) return existing;

  const state: QueueState = { tracks: [], currentIndex: 0, loop: false };
  queues.set(guildId, state);
  return state;
}

export function addTrack(guildId: string, track: Track): number {
  const state = getOrCreate(guildId);
  state.tracks.push(track);
  return state.tracks.length;
}

export function getCurrentTrack(guildId: string): Track | undefined {
  const state = queues.get(guildId);
  if (!state) return undefined;
  return state.tracks[state.currentIndex];
}

export function nextTrack(guildId: string): Track | undefined {
  const state = queues.get(guildId);
  if (!state) return undefined;

  if (state.loop) {
    return state.tracks[state.currentIndex];
  }

  state.currentIndex++;
  if (state.currentIndex >= state.tracks.length) {
    return undefined;
  }
  return state.tracks[state.currentIndex];
}

export function getTracks(guildId: string): readonly Track[] {
  return queues.get(guildId)?.tracks ?? [];
}

export function getCurrentIndex(guildId: string): number {
  return queues.get(guildId)?.currentIndex ?? 0;
}

export function clearQueue(guildId: string): void {
  queues.delete(guildId);
}

export function toggleLoop(guildId: string): boolean {
  const state = getOrCreate(guildId);
  state.loop = !state.loop;
  return state.loop;
}

export function isLooping(guildId: string): boolean {
  return queues.get(guildId)?.loop ?? false;
}

export function hasQueue(guildId: string): boolean {
  return queues.has(guildId);
}
