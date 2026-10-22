import { evaluateEntry } from './evaluator.js';
import { processEntry } from './llm.js';
import { getEntry, getUnreadEntries, markAsRead } from './rssify.js';
import type { ProcessableEntry, RssifyEntry } from './types.js';

// Stop picking up new entries well before the function's maxDuration, so a
// running evaluation or post has time to finish; the rest waits for the next run.
const TIME_BUDGET_MS = 180_000;

function mapToProcessableEntry(
  entry: RssifyEntry & { url: string },
): ProcessableEntry {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.contentHtml ?? entry.summary ?? '',
    url: entry.url,
    published_at: entry.publishedAt ?? entry.sortAt,
    feed: {
      title: entry.feedTitle ?? '',
    },
  };
}

async function processOneEntry(): Promise<void> {
  const startedAt = Date.now();
  const unread = await getUnreadEntries();
  console.log(`Unread entries: ${unread.length}`);

  for (const { id } of unread) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      console.log('Time budget spent, leaving the rest for the next run');
      return;
    }

    const entry = await getEntry(id);
    console.log(`Processing entry: ${entry.title} (ID: ${entry.id})`);

    if (!entry.url) {
      console.log(`Skipping entry ${entry.id}: no URL to link to`);
      await markAsRead(entry.id);
      continue;
    }

    const processable = mapToProcessableEntry({ ...entry, url: entry.url });

    const evaluation = await evaluateEntry(processable);
    console.log(
      `Entry ${entry.id}: score=${evaluation.score}, reason="${evaluation.reason}"`,
    );

    if (!evaluation.shouldPublish) {
      console.log(`Skipping entry ${entry.id}: score below threshold`);
      await markAsRead(entry.id);
      continue;
    }

    try {
      const result = await processEntry(processable);

      if (result.status === 'rejected') {
        console.log(`Writer rejected entry ${entry.id}: "${result.reason}"`);
        await markAsRead(entry.id);
        continue;
      }

      console.log(`Published entry ${entry.id} to Telegram`);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to process entry ${entry.id}: ${errorMessage}`);
      throw error;
    }
  }

  console.log('No unread entries left');
}

export async function runCronJob(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting cron job...`);

  try {
    await processOneEntry();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Cron job entry processing failed: ${errorMessage}`);
  }

  console.log(`[${new Date().toISOString()}] Cron job completed`);
}
