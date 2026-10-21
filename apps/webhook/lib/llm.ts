import { runAgent } from './agent.ts';
import { fetchEntryContent } from './miniflux.ts';
import { sendToTelegram } from './telegram.ts';
import { validatePost } from './validate.ts';
import type { ProcessableEntry } from './types.ts';

export type PublishResult =
  | { status: 'published' }
  | { status: 'rejected'; reason: string };

const postSchema = {
  type: 'object',
  properties: { markdown: { type: 'string' } },
  required: ['markdown'],
  additionalProperties: false,
};

export async function processEntry(
  entry: ProcessableEntry,
): Promise<PublishResult> {
  let result: PublishResult | null = null;

  const { stopReason } = await runAgent({
    label: `write:${entry.id}`,
    model: { id: 'anthropic/claude-sonnet-5.5', effort: 'high' },
    instructions: `Ты автор популярного IT Telegram-канала.

ФОРМАТ ПОСТА:
- Эмодзи + заголовок (он либо жирный, либо заголовк)
- Пустая строка
- 2-3 коротких абзаца о сути
- Пустая строка
- ссылка типа [Новость|Статья|Блог|Страница|Пользователь|что то подходящее по смыслу](url)
- Пустая строка
- хештеги

ЗАПРЕЩЕНО:
- Код и примеры кода (только если оооочень коротко)
- Списки, перечисления
- Таблицы

ПРИМЕР:

**✨Магия deepSignal**

Статья раскрывает, как утилита **deepSignal** решает проблему реактивности при работе с вложенным состоянием.

Утилита создает WritableSignal для конкретного свойства передаваемого сигнала, который реагирует только на изменения этого свойства, игнорируя остальные поля.

Это особенно полезно при работе с большими формами, позволяя обновлять только необходимые части без лишних перерасчетов.

[Читать](https://example.com/deepSignal)

КАК РАБОТАТЬ:
1. Если текст из RSS короткий или обрезан, загрузи полную статью через fetch_full_article.
2. Напиши пост и проверь его через validate_post. Исправляй и проверяй снова, пока проверка не пройдёт.
3. Опубликуй ровно проверенный текст через publish_post. Публикуй один раз.
4. Если после чтения полной статьи понятно, что публиковать нечего (реклама, пейволл, пустая страница, нет сути), вызови reject_entry с причиной вместо публикации.`,
    tools: [
      {
        name: 'fetch_full_article',
        description:
          'Downloads the full text of the article from its original page (HTML).',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        idempotent: true,
        execute: () => fetchEntryContent(entry.id),
      },
      {
        name: 'validate_post',
        description:
          'Checks a draft post against the channel format rules and the Telegram size limit.',
        inputSchema: postSchema,
        idempotent: true,
        execute: ({ markdown }: { markdown: string }) =>
          validatePost(markdown, entry.url),
      },
      {
        name: 'publish_post',
        description:
          'Publishes the post to the Telegram channel. Call once, with a post that passed validate_post.',
        inputSchema: postSchema,
        idempotent: false,
        execute: async ({ markdown }: { markdown: string }) => {
          if (result) {
            throw new Error(`Already finished: ${result.status}`);
          }
          const validation = validatePost(markdown, entry.url);
          if (!validation.ok) {
            throw new Error(
              `Post failed validation: ${validation.problems.join(' ')}`,
            );
          }
          await sendToTelegram(markdown);
          result = { status: 'published' };
          return 'Published.';
        },
      },
      {
        name: 'reject_entry',
        description:
          'Declines to publish this entry when the full article has nothing worth posting.',
        inputSchema: {
          type: 'object',
          properties: { reason: { type: 'string' } },
          required: ['reason'],
          additionalProperties: false,
        },
        idempotent: true,
        execute: ({ reason }: { reason: string }) => {
          if (result) {
            throw new Error(`Already finished: ${result.status}`);
          }
          result = { status: 'rejected', reason };
          return 'Rejected.';
        },
      },
    ],
    prompt: `Перепиши эту новость в своём стиле и опубликуй:

Заголовок: ${entry.title}
Источник: ${entry.feed.title}
URL: ${entry.url}
Дата: ${entry.published_at}

${entry.content}`,
  });

  if (!result) {
    throw new Error(
      `Writer finished without publishing or rejecting entry ${entry.id} (stop=${stopReason})`,
    );
  }

  return result;
}
