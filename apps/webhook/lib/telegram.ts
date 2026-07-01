import { splitMessage, toTelegramHTML, toTelegramRich } from 'md-to-telegram';
import { bot } from '@packages/bot';
import { env } from '@packages/env';

async function sendAsHtml(markdown: string): Promise<void> {
  const { text } = toTelegramHTML(markdown);

  for (const part of splitMessage(text, { format: 'html' })) {
    await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, part, {
      parse_mode: 'HTML',
      disable_notification: true,
      link_preview_options: { is_disabled: false },
    });
  }
}

export async function sendToTelegram(markdown: string): Promise<void> {
  const { text } = toTelegramRich(markdown);
  const parts = splitMessage(text, { format: 'rich' });

  let sent = 0;

  try {
    for (const part of parts) {
      await bot.api.sendRichMessage(
        env.TELEGRAM_CHAT_ID,
        { markdown: part },
        { disable_notification: true },
      );
      sent++;
    }
  } catch (error) {
    // If a part already reached the chat, re-sending as HTML would duplicate it.
    if (sent > 0) throw error;

    // Rich Messages (Bot API 10.1) aren't supported by every client/chat —
    // fall back to plain HTML so the post still goes out.
    console.warn('Rich message failed, falling back to HTML:', error);
    await sendAsHtml(markdown);
  }
}
