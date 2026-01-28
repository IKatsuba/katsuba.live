import { processEntry } from './lib/llm.ts';
import { evaluateEntry } from './lib/evaluator.ts';
import { sendToTelegram } from './lib/telegram.ts';
import {
  getFeedsWithErrors,
  getNextUnreadEntry,
  markAsRead,
  refreshFeed,
} from './lib/miniflux.ts';
import type { MinifluxEntry, ProcessableEntry } from './lib/types.ts';

function mapToProcessableEntry(entry: MinifluxEntry): ProcessableEntry {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    url: entry.url,
    published_at: entry.published_at,
    feed: {
      title: entry.feed.title,
    },
  };
}

async function processOneEntry(): Promise<void> {
  while (true) {
    const entry = await getNextUnreadEntry();

    if (!entry) {
      console.log('No unread entries');
      return;
    }

    console.log(`Processing entry: ${entry.title} (ID: ${entry.id})`);

    const processable = mapToProcessableEntry(entry);

    const evaluation = await evaluateEntry(processable);
    console.log(
      `Entry ${entry.id}: score=${evaluation.score}, reason="${evaluation.reason}"`,
    );

    if (!evaluation.shouldPublish) {
      console.log(`Skipping entry ${entry.id}: score below threshold`);
      await markAsRead([entry.id]);
      continue;
    }

    try {
      const aiResponse = await processEntry(processable);
      await sendToTelegram(aiResponse.text);
      console.log(`Published entry ${entry.id} to Telegram`);
      await markAsRead([entry.id]);
      return;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Failed to process entry ${entry.id}: ${errorMessage}`);
      throw error;
    }
  }
}

async function checkAndRefreshErrorFeeds(): Promise<void> {
  try {
    const feedsWithErrors = await getFeedsWithErrors();

    if (feedsWithErrors.length === 0) {
      console.log('No feeds with errors');
      return;
    }

    console.log(`Found ${feedsWithErrors.length} feeds with errors`);

    for (const feed of feedsWithErrors) {
      console.log(
        `Refreshing feed: ${feed.title} (ID: ${feed.id}, errors: ${feed.parsing_error_count})`,
      );
      try {
        await refreshFeed(feed.id);
        console.log(`Successfully refreshed feed ${feed.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        console.error(`Failed to refresh feed ${feed.id}: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to check error feeds: ${errorMessage}`);
  }
}

async function runCronJob(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting cron job...`);

  try {
    await processOneEntry();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Cron job entry processing failed: ${errorMessage}`);
  }

  await checkAndRefreshErrorFeeds();

  console.log(`[${new Date().toISOString()}] Cron job completed`);
}

await runCronJob();
Deno.exit(0);
