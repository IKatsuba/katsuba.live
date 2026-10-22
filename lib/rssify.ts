import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { env } from './env.js';
import type { RssifyEntriesResponse, RssifyEntry } from './types.js';

const headers = { 'x-api-key': env.RSSIFY_API_KEY };

async function request(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, env.RSSIFY_API_URL);
  const response = await fetch(url, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!response.ok) {
    throw new Error(
      `rssify ${init?.method ?? 'GET'} ${url.pathname}: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

// rssify lists newest first, so walk every page and reverse to get the
// oldest unread entry first.
export async function getUnreadEntries(): Promise<RssifyEntry[]> {
  const entries: RssifyEntry[] = [];
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({ unread: 'true', limit: '100' });
    if (cursor) query.set('cursor', cursor);

    const response = await request(`/api/v1/entries?${query}`);
    const data: RssifyEntriesResponse = await response.json();
    entries.push(...data.entries);
    cursor = data.nextCursor;
  } while (cursor);

  return entries.reverse();
}

export async function getEntry(entryId: string): Promise<RssifyEntry> {
  const response = await request(`/api/v1/entries/${entryId}`);
  const data: { entry: RssifyEntry } = await response.json();
  return data.entry;
}

export async function markAsRead(entryId: string): Promise<void> {
  await request(`/api/v1/entries/${entryId}/read`, { method: 'PUT' });
}

// rssify keeps only what the feed carries; the full article comes from the
// original page.
export async function fetchArticle(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; katsuba.live)' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const { document } = parseHTML(await response.text());
  const article = new Readability(document).parse();

  if (!article?.content) {
    throw new Error(`No readable article at ${url}`);
  }

  return article.content;
}
