import type { BotModule } from "../../core/module";
import {
  nowPlayingCommand,
  pauseCommand,
  queueCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
} from "./commands/controls";
import { playCommand } from "./commands/play";
import { registerMusicEvents } from "./events";

export const musicModule: BotModule = {
  name: "music",
  description: "Player de música (YouTube, SoundCloud, links diretos) via Lavalink",
  requires: ["voice"],
  commands: [playCommand, skipCommand, stopCommand, pauseCommand, resumeCommand, nowPlayingCommand, queueCommand],
  init(ctx) {
    registerMusicEvents(ctx);
  },
};
