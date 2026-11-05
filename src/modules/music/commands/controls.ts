import { errorEmbed, successEmbed } from "../../../core/embeds";
import type { Command } from "../../../core/module";
import { nowPlayingEmbed, queueEmbed } from "../embeds";
import { controllablePlayer } from "../guards";

const QUEUE_PAGE_SIZE = 10;

export const skipCommand: Command = {
  name: "skip",
  aliases: ["s", "next"],
  description: "Pula a música atual",
  async execute(message, _args, ctx) {
    const player = await controllablePlayer(message, ctx);
    if (!player) return;

    if (player.queue.tracks.length > 0) await player.skip();
    // Última da fila: para e deixa o timer de "fila vazia" tirar o bot do canal
    else await player.stopPlaying(false, false);

    await message.reply({ embeds: [successEmbed("Música pulada.")] });
  },
};

export const stopCommand: Command = {
  name: "stop",
  aliases: ["parar", "leave", "sair"],
  description: "Para a música, limpa a fila e sai do canal",
  async execute(message, _args, ctx) {
    const player = await controllablePlayer(message, ctx);
    if (!player) return;

    await player.destroy("stop");
    await message.reply({ embeds: [successEmbed("Parei e saí do canal.")] });
  },
};

export const pauseCommand: Command = {
  name: "pause",
  aliases: ["pausar"],
  description: "Pausa a música",
  async execute(message, _args, ctx) {
    const player = await controllablePlayer(message, ctx);
    if (!player) return;

    if (player.paused) {
      await message.reply({ embeds: [errorEmbed("Já está pausado.")] });
      return;
    }
    await player.pause();
    await message.reply({ embeds: [successEmbed("Pausado.")] });
  },
};

export const resumeCommand: Command = {
  name: "resume",
  aliases: ["continuar", "unpause"],
  description: "Continua a música pausada",
  async execute(message, _args, ctx) {
    const player = await controllablePlayer(message, ctx);
    if (!player) return;

    if (!player.paused) {
      await message.reply({ embeds: [errorEmbed("Não está pausado.")] });
      return;
    }
    await player.resume();
    await message.reply({ embeds: [successEmbed("Continuando.")] });
  },
};

export const nowPlayingCommand: Command = {
  name: "np",
  aliases: ["nowplaying", "tocando"],
  description: "Mostra a música tocando agora",
  async execute(message, _args, ctx) {
    const current = ctx.service("voice").getPlayer(message.guildId)?.queue.current;
    if (!current) {
      await message.reply({ embeds: [errorEmbed("Não há música tocando.")] });
      return;
    }
    const position = ctx.service("voice").getPlayer(message.guildId)?.position;
    await message.reply({ embeds: [nowPlayingEmbed(current, position)] });
  },
};

export const queueCommand: Command = {
  name: "queue",
  aliases: ["q", "fila"],
  description: "Mostra a fila de músicas",
  async execute(message, _args, ctx) {
    const player = ctx.service("voice").getPlayer(message.guildId);
    const current = player?.queue.current;
    if (!player || !current) {
      await message.reply({ embeds: [errorEmbed("A fila está vazia.")] });
      return;
    }
    const upcoming = player.queue.tracks.slice(0, QUEUE_PAGE_SIZE);
    await message.reply({ embeds: [queueEmbed(current, upcoming, player.queue.tracks.length)] });
  },
};
