import { lookup } from 'node:dns';
import { BlockList, isIP } from 'node:net';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import {
  Agent,
  fetch as undiciFetch,
  type Response as UndiciResponse,
} from 'undici';
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
// original page. The URL comes from a feed, so the fetch may only reach the
// public internet and reads a bounded amount of HTML.
const MAX_ARTICLE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

const privateRanges = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 4],
] as const) {
  privateRanges.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  privateRanges.addSubnet(address, prefix, 'ipv6');
}

function isPrivateAddress(address: string): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return isPrivateAddress(mapped);
  const family = isIP(address);
  return (
    family !== 0 && privateRanges.check(address, family === 4 ? 'ipv4' : 'ipv6')
  );
}

// Every connection resolves through here, so a hostname that points inside
// (or is rebound there between requests) is refused at connect time.
const publicOnly = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, '', 0);
        const blocked = addresses.find(({ address }) =>
          isPrivateAddress(address),
        );
        if (blocked) {
          return callback(
            new Error(`${hostname} resolves to a private address`),
            '',
            0,
          );
        }
        if (options.all) return callback(null, addresses);
        callback(null, addresses[0].address, addresses[0].family);
      });
    },
  },
});

function checkArticleUrl(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Refusing to fetch ${url}: not http(s)`);
  }
  // An IP literal never reaches the lookup above
  if (isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
    throw new Error(`Refusing to fetch ${url}: private address`);
  }
}

async function readLimited(response: UndiciResponse): Promise<string> {
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_ARTICLE_BYTES) {
    throw new Error(`Article is too large: ${length} bytes`);
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    size += chunk.byteLength;
    if (size > MAX_ARTICLE_BYTES) {
      throw new Error(`Article is larger than ${MAX_ARTICLE_BYTES} bytes`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function fetchArticle(articleUrl: string): Promise<string> {
  const signal = AbortSignal.timeout(20_000);
  let url = new URL(articleUrl);
  let response: UndiciResponse;

  // Redirects are followed by hand so each hop is checked
  for (let hop = 0; ; hop++) {
    checkArticleUrl(url);
    response = await undiciFetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; katsuba.live)' },
      redirect: 'manual',
      dispatcher: publicOnly,
      signal,
    });

    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) break;
    if (hop >= MAX_REDIRECTS) {
      throw new Error(`Too many redirects fetching ${articleUrl}`);
    }
    await response.body?.cancel();
    url = new URL(location, url);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!/html/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error(`Not an HTML page at ${url}: ${contentType}`);
  }

  const { document } = parseHTML(await readLimited(response));
  const article = new Readability(document).parse();

  if (!article?.content) {
    throw new Error(`No readable article at ${url}`);
  }

  return article.content;
}
