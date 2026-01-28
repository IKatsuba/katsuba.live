import { env } from '@packages/env';
import type {
  MinifluxEntriesResponse,
  MinifluxEntry,
  MinifluxFeed,
} from './types.ts';

const headers = {
  'X-Auth-Token': env.MINIFLUX_API_KEY,
  'Content-Type': 'application/json',
};

export async function getNextUnreadEntry(): Promise<MinifluxEntry | null> {
  const url = new URL('/v1/entries', env.MINIFLUX_API_URL);
  url.searchParams.set('status', 'unread');
  url.searchParams.set('order', 'published_at');
  url.searchParams.set('direction', 'asc');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch entries: ${response.status} ${response.statusText}`,
    );
  }

  const data: MinifluxEntriesResponse = await response.json();
  return data.entries[0] ?? null;
}

export async function markAsRead(entryIds: number[]): Promise<void> {
  const url = new URL('/v1/entries', env.MINIFLUX_API_URL);

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      entry_ids: entryIds,
      status: 'read',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to mark entries as read: ${response.status} ${response.statusText}`,
    );
  }
}

export async function getFeeds(): Promise<MinifluxFeed[]> {
  const url = new URL('/v1/feeds', env.MINIFLUX_API_URL);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch feeds: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function getFeedsWithErrors(): Promise<MinifluxFeed[]> {
  const feeds = await getFeeds();
  return feeds.filter((feed) => feed.parsing_error_count > 0);
}

export async function refreshFeed(feedId: number): Promise<void> {
  const url = new URL(`/v1/feeds/${feedId}/refresh`, env.MINIFLUX_API_URL);

  const response = await fetch(url, {
    method: 'PUT',
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to refresh feed ${feedId}: ${response.status} ${response.statusText}`,
    );
  }
}
