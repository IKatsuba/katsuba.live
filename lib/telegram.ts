import { splitMessage, toTelegramMarkdownV2 } from 'md-to-telegram';
import { bot } from './bot.js';
import { env } from './env.js';

export async function sendToTelegram(markdown: string): Promise<void> {
  const { text } = toTelegramMarkdownV2(markdown);

  for (const part of splitMessage(text, { format: 'markdownv2' })) {
    await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, part, {
      parse_mode: 'MarkdownV2',
      disable_notification: true,
      link_preview_options: { is_disabled: false },
    });
  }
}
