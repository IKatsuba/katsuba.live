import { verifySignature } from './lib/signature.ts';
import { processEntry } from './lib/llm.ts';
import { sendToTelegram } from './lib/telegram.ts';
import type {
  NewEntriesPayload,
  ProcessableEntry,
  WebhookEntry,
  WebhookFeed,
} from './lib/types.ts';

const PORT = Number(Deno.env.get('PORT')) || 8000;

function mapToProcessableEntry(
  entry: WebhookEntry,
  feed: WebhookFeed,
): ProcessableEntry {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    url: entry.url,
    published_at: entry.published_at,
    feed: {
      title: feed.title,
    },
  };
}

async function handleWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get('X-Miniflux-Signature');
  const eventType = request.headers.get('X-Miniflux-Event-Type');
  const body = await request.text();

  const isValid = await verifySignature(body, signature);
  if (!isValid) {
    console.log('Invalid signature');
    return new Response('Unauthorized', { status: 401 });
  }

  if (eventType !== 'new_entries') {
    console.log(`Ignoring event type: ${eventType}`);
    return new Response('OK', { status: 200 });
  }

  const payload: NewEntriesPayload = JSON.parse(body);
  const results: { id: number; success: boolean; error?: string }[] = [];

  for (const entry of payload.entries) {
    try {
      console.log(`Processing entry: ${entry.title} (ID: ${entry.id})`);

      const processable = mapToProcessableEntry(entry, payload.feed);
      const aiResponse = await processEntry(processable);

      await sendToTelegram(aiResponse.text);
      console.log(`Sent entry ${entry.id} to Telegram`);

      results.push({ id: entry.id, success: true });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Failed to process entry ${entry.id}: ${errorMessage}`);
      results.push({ id: entry.id, success: false, error: errorMessage });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function handler(request: Request): Response | Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/health' && request.method === 'GET') {
    return new Response('OK', { status: 200 });
  }

  if (url.pathname === '/webhook' && request.method === 'POST') {
    return handleWebhook(request);
  }

  return new Response('Not Found', { status: 404 });
}

console.log(`Webhook server listening on port ${PORT}`);
Deno.serve({ port: PORT }, handler);
