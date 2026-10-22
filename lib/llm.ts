import { runAgent } from './agent.js';
import { AUDIENCE } from './audience.js';
import { fetchArticle, markAsRead } from './rssify.js';
import { sendToTelegram } from './telegram.js';
import { validatePost } from './validate.js';
import type { ProcessableEntry } from './types.js';

export type PublishResult =
  { status: 'published' } | { status: 'rejected'; reason: string };

const postSchema = {
  type: 'object',
  properties: { markdown: { type: 'string' } },
  required: ['markdown'],
  additionalProperties: false,
};

export async function processEntry(
  entry: ProcessableEntry,
  editorNote: string,
): Promise<PublishResult> {
  let result: PublishResult | null = null;

  const { stopReason, text } = await runAgent({
    label: `write:${entry.id}`,
    model: { id: 'anthropic/claude-sonnet-5.5', effort: 'high' },
    instructions: [
      AUDIENCE,
      `Ты автор популярного IT Telegram-канала. Пиши для этой аудитории: объясняй, почему новость важна именно ей.

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
1. Если текст из RSS короткий или обрезан, загрузи полную статью через fetch_full_article. Если она не загрузилась (сайт закрыт для ботов) или в ней мало сути, найди оригинал или подробности через web_search. Пиши только то, что подтверждено статьёй, поиском или заметкой редактора.
2. Напиши пост и проверь его через validate_post. Исправляй и проверяй снова, пока проверка не пройдёт.
3. Опубликуй ровно проверенный текст через publish_post. Публикуй один раз.
4. Если и после статьи и поиска понятно, что публиковать нечего (реклама, пейволл, пустая страница, нет сути), вызови reject_entry с причиной вместо публикации.`,
    ],
    tools: [
      { name: 'web_search', providerExecuted: true },
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
        execute: () => fetchArticle(entry.url),
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
          // Mark read right away so a later failure in the turn can't republish it
          await markAsRead(entry.id);
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

Заметка редактора, который отобрал новость (он мог проверить детали поиском):
${editorNote}

${entry.content}`,
  });

  if (!result) {
    throw new Error(
      `Writer finished without publishing or rejecting entry ${entry.id} (stop=${stopReason}): ${text.trim().slice(-500)}`,
    );
  }

  return result;
}
