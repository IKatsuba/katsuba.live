import { bot } from '@packages/bot';
import { env } from '@packages/env';
import { telegramify } from './utils.ts';

function splitTextIntoChunks(text: string, chunkSize = 4096): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

export async function sendToTelegram(text: string): Promise<void> {
  for (const chunk of splitTextIntoChunks(text)) {
    await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, telegramify(chunk), {
      parse_mode: 'MarkdownV2',
      disable_notification: true,
      link_preview_options: { is_disabled: false },
    });
  }
}
