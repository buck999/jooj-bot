import { EmbedBuilder } from "discord.js";

export const BRAND_COLOR = 0x7289da;

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0xff0000).setDescription(`❌ ${message}`);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0x00ff00).setDescription(`✅ ${message}`);
}

export function infoEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(BRAND_COLOR).setDescription(message);
}
