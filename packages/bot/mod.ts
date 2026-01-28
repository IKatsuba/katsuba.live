import { Bot } from 'grammy';

const botToken = Deno.env.get('BOT_TOKEN');

if (!botToken) {
  throw new Error('BOT_TOKEN is not set');
}

export const bot = new Bot(botToken);
