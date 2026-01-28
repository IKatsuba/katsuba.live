import { getEntries, markEntryAsRead } from '@fixcv/miniflux';
import { bot } from '@fixcv/bot';
import { processEntry } from './lib/llm.ts';
import { processMarkdown } from './lib/md.ts';
import { telegramify } from './lib/utils.ts';

const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

if (!TELEGRAM_CHAT_ID) {
  throw new Error('TELEGRAM_CHAT_ID is not set');
}

async function main() {
  console.log('🚀 Starting publish cron job');

  try {
    const {
      entries: [entry],
    } = await getEntries({
      status: 'unread',
      limit: 1,
    });

    if (!entry) {
      console.log('📭 No unread entries found');
      return;
    }

    console.log('🤖 Getting AI response...');
    const aiResponse = await processEntry(entry);
    console.log('✓ Received AI response');

    console.log('📋 Processing markdown...');
    const markdown = await processMarkdown(aiResponse.text);
    console.log('✓ Markdown processed');

    console.log('📤 Sending to Telegram...');
    await sendLongText(markdown);
    console.log('✅ Message sent successfully');

    console.log(`📝 Processing entry: ${entry.title} (ID: ${entry.id})`);
    await markEntryAsRead(entry.id);
    console.log(`✓ Marked entry ${entry.id} as read`);
  } catch (error) {
    console.error('❌ Error in publish cron:', error);
    throw error; // Перебрасываем ошибку дальше для обработки Deno
  }
}

function splitTextIntoChunks(text: string, chunkSize = 4096) {
  const chunks = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

export async function sendLongText(text: string) {
  for (const chunk of splitTextIntoChunks(text)) {
    await bot.api.sendMessage(TELEGRAM_CHAT_ID!, telegramify(chunk), {
      parse_mode: 'MarkdownV2',
      disable_notification: true,
    });
  }
}

await main();

Deno.exit(0);
