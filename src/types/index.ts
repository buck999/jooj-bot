import { Message } from "discord.js";

export interface Command {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly description: string;
  execute(message: Message, args: readonly string[]): Promise<void>;
}
