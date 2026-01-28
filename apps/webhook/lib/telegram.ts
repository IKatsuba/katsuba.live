import { bot } from '@packages/bot';
import { telegramify } from './utils.ts';

const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

if (!TELEGRAM_CHAT_ID) {
  throw new Error('TELEGRAM_CHAT_ID is not set');
}

function splitTextIntoChunks(text: string, chunkSize = 4096): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

export async function sendToTelegram(text: string): Promise<void> {
  for (const chunk of splitTextIntoChunks(text)) {
    await bot.api.sendMessage(TELEGRAM_CHAT_ID!, telegramify(chunk), {
      parse_mode: 'MarkdownV2',
      disable_notification: true,
    });
  }
}
