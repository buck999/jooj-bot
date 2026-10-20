import { Collection } from "discord.js";
import { Command } from "../types";

import { playCommand } from "./music/play";
import { skipCommand } from "./music/skip";
import { stopCommand } from "./music/stop";
import { queueCommand } from "./music/queue";
import { pauseCommand } from "./music/pause";
import { resumeCommand } from "./music/resume";
import { npCommand } from "./music/np";
import { ttsCommand } from "./tts/tts";

const commands = new Collection<string, Command>();

const allCommands: Command[] = [
  playCommand,
  skipCommand,
  stopCommand,
  queueCommand,
  pauseCommand,
  resumeCommand,
  npCommand,
  ttsCommand,
];

for (const cmd of allCommands) {
  commands.set(cmd.name, cmd);
  for (const alias of cmd.aliases) {
    commands.set(alias, cmd);
  }
}

export { commands };
