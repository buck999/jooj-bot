import { Message } from "discord.js";

export interface Command {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly description: string;
  execute(message: Message, args: readonly string[]): Promise<void>;
}

export interface Track {
  readonly title: string;
  readonly url: string;
  readonly duration: string;
  readonly requestedBy: string;
}

export interface GuildQueue {
  readonly tracks: Track[];
  readonly playing: boolean;
  readonly volume: number;
  readonly loop: boolean;
}
