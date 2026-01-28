const MINIFLUX_URL = Deno.env.get('MINIFLUX_URL');
const MINIFLUX_TOKEN = Deno.env.get('MINIFLUX_TOKEN');

if (!MINIFLUX_URL) {
  throw new Error('MINIFLUX_URL must be set');
}

if (!MINIFLUX_TOKEN) {
  throw new Error('MINIFLUX_TOKEN must be set');
}

export type Entry = {
  id: number;
  feed: {
    id: number;
    feed_url: string;
    site_url: string;
    title: string;
    description: string;
  };
  title: string;
  content: string;
  url: string;
  published_at: string;
};

export async function getEntries(query: {
  status: 'unread' | 'read' | 'removed';
  limit: number;
}): Promise<{
  entries: Entry[];
}> {
  const response = await fetch(
    `${MINIFLUX_URL}/v1/entries?${
      new URLSearchParams(
        query as unknown as Record<string, string>,
      ).toString()
    }`,
    {
      headers: {
        'X-Auth-Token': MINIFLUX_TOKEN!,
      },
    },
  );

  return response.json();
}

export async function markEntryAsRead(...ids: number[]): Promise<void> {
  await fetch(`${MINIFLUX_URL}/v1/entries`, {
    method: 'PUT',
    body: JSON.stringify({
      entry_ids: [...ids],
      status: 'read',
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': MINIFLUX_TOKEN!,
    },
  });
}
