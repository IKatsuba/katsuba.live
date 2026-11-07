import { runAgent } from './agent.js';
import { markAsRead } from './rssify.js';
import { sendAudioToTelegram } from './telegram.js';
import { validatePost } from './validate.js';
import type { ProcessableEntry } from './types.js';

// katsuba.fm is the author's weekly news podcast. Every episode is published as
// an audio post; the evaluator does not judge it.
const PODCAST_FEED_URL = 'https://fm.katsuba.dev/feed.xml';
const PODCAST_HOST = new URL(PODCAST_FEED_URL).host;
const MAX_TRANSCRIPT_CHARS = 30_000;

export type Episode = {
  title: string;
  notes: string;
  audioUrl: string;
  transcript: string | null;
};

// Only a candidate: any feed can link here, so fetchEpisode() decides
export function isPodcastLink(url: string): boolean {
  return URL.canParse(url) && new URL(url).host === PODCAST_HOST;
}

const unescapeXml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

// The episode is read from the podcast's own feed, not from the rssify entry:
// rssify keeps neither the audio nor the transcript, and only an item of this
// feed is an episode. Returns null when the link is not an episode.
export async function fetchEpisode(
  episodeUrl: string,
): Promise<Episode | null> {
  const feed = await fetchText(PODCAST_FEED_URL);
  const item = feed
    .split('<item>')
    .slice(1)
    .find((item) =>
      item.includes(`<link>${episodeUrl.replace(/&/g, '&amp;')}</link>`),
    );
  const title = item?.match(/<title>([^<]*)<\/title>/)?.[1];
  const audio = item?.match(/<enclosure\s[^>]*url="([^"]+)"/)?.[1];
  if (!item || !title || !audio) {
    return null;
  }
  const notes =
    item.match(
      /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/,
    )?.[1] ?? '';

  const transcriptUrl = item.match(
    /<podcast:transcript\s[^>]*url="([^"]+)"/,
  )?.[1];
  let transcript: string | null = null;
  if (transcriptUrl) {
    try {
      const text = (await fetchText(unescapeXml(transcriptUrl))).trim();
      transcript =
        text.length > MAX_TRANSCRIPT_CHARS
          ? `${text.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[Transcript truncated]`
          : text;
    } catch (error) {
      // The show notes are enough to write the caption
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Transcript for ${episodeUrl} unavailable: ${message}`);
    }
  }

  return {
    title: unescapeXml(title),
    notes,
    audioUrl: unescapeXml(audio),
    transcript,
  };
}

// Telegram limits an audio caption to 1024 characters of visible text; link
// targets and formatting do not count.
const MAX_CAPTION_CHARS = 1000;

function visibleLength(markdown: string): number {
  return markdown
    .replace(/\]\([^)]*\)/g, '')
    .replace(/^#{1,3} /gm, '')
    .replace(/[*_~`[\]]/g, '').length;
}

const postSchema = {
  type: 'object',
  properties: { markdown: { type: 'string' } },
  required: ['markdown'],
  additionalProperties: false,
};

export async function publishEpisode(
  entry: ProcessableEntry,
  episode: Episode,
): Promise<void> {
  let published = false;

  const validate = (markdown: string) => {
    const validation = validatePost(markdown, entry.url);
    const length = visibleLength(markdown);
    if (length > MAX_CAPTION_CHARS) {
      validation.ok = false;
      validation.problems.push(
        `The caption has ${length} visible characters; keep it under ${MAX_CAPTION_CHARS}.`,
      );
    }
    return validation;
  };

  const { stopReason, text } = await runAgent({
    label: `podcast:${entry.id}`,
    model: { id: 'vmc/katsuba-live-writer' },
    instructions: `Ты ведёшь IT Telegram-канал katsuba_live. Вышел новый выпуск подкаста katsuba.fm: еженедельной сводки главного из веб-разработки и AI. Подкаст делает автор канала, и выпуск публикуется в канале всегда. Твой текст станет подписью к аудиофайлу выпуска, поэтому он должен быть коротким: не больше ${MAX_CAPTION_CHARS} знаков.

ФОРМАТ ПОДПИСИ:
- Эмодзи + жирный заголовок: номер выпуска и две-три главные темы
- Пустая строка
- 1-2 коротких абзаца: о чём выпуск и почему его стоит послушать. Назови самые важные для разработчиков темы недели, а не все подряд
- Пустая строка
- ссылка [Все ссылки выпуска](url)
- Пустая строка
- хештеги: #katsubafm #подкаст и 1-3 по темам выпуска

Пиши только то, что есть в расшифровке и описании выпуска. Без списков, таблиц и кода.

КАК РАБОТАТЬ:
1. Напиши подпись и проверь её через validate_post. Исправляй и проверяй снова, пока проверка не пройдёт.
2. Опубликуй ровно проверенный текст через publish_post. Публикуй один раз.`,
    tools: [
      {
        name: 'validate_post',
        description:
          'Checks a draft caption against the channel format rules and the Telegram caption limit.',
        inputSchema: postSchema,
        idempotent: true,
        execute: ({ markdown }: { markdown: string }) => validate(markdown),
      },
      {
        name: 'publish_post',
        description:
          'Publishes the episode audio with this caption to the Telegram channel. Call once, with a caption that passed validate_post.',
        inputSchema: postSchema,
        idempotent: false,
        execute: async ({ markdown }: { markdown: string }) => {
          if (published) {
            throw new Error('Already published');
          }
          const validation = validate(markdown);
          if (!validation.ok) {
            throw new Error(
              `Caption failed validation: ${validation.problems.join(' ')}`,
            );
          }
          await sendAudioToTelegram(episode.audioUrl, markdown, {
            title: episode.title,
            performer: entry.feed.title,
          });
          published = true;
          // Mark read right away so a later failure in the turn can't republish it
          await markAsRead(entry.id);
          return 'Published.';
        },
      },
    ],
    prompt: `Напиши подпись к выпуску и опубликуй его:

Заголовок: ${episode.title}
URL: ${entry.url}
Дата: ${entry.published_at}

Описание выпуска:
${episode.notes}

Расшифровка выпуска:
${episode.transcript ?? '(расшифровки нет, пиши по описанию)'}`,
  });

  if (!published) {
    throw new Error(
      `Podcast writer finished without publishing entry ${entry.id} (stop=${stopReason}): ${text.trim().slice(-500)}`,
    );
  }
}
