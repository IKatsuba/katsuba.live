import { Bot } from 'grammy';
import { env } from '@packages/env';

export const bot = new Bot(env.BOT_TOKEN);
