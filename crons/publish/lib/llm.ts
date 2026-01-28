import { generateText } from 'ai';
import { Entry } from '@fixcv/miniflux';

export function processEntry(entry: Entry) {
  return generateText({
    model: 'openai/gpt-5-mini',
    temperature: 0.7,
    system: `Ты редактор новостного Telegram-канала на русском языке.

ЗАДАЧА: Подготовить новость для публикации в Telegram.

ФОРМАТ:
- Используй Markdown (жирный, курсив, ссылки)
- БЕЗ таблиц
- Добавляй эмоджи для акцентов
- Хештеги только на английском в конце

СТИЛЬ:
- Пиши от третьего лица (обозреватель, не автор)
- Только факты, без мнений
- Переводи на русский, если нужно
- Сохраняй структуру, если контент уже в Markdown

ОСОБЫЕ СЛУЧАИ:
- GitHub тренды: "В тренды попал репозиторий [название], набравший X звезд и Y форков"

ОБЯЗАТЕЛЬНО: Включи ссылку на источник, но будь акуратен. Всякие githubcontent это картинки. На них ссылки не нужны`,
    prompt: `title: ${entry.title}
source: ${entry.feed.title}
url: ${entry.url}
date: ${entry.published_at}

${entry.content}`,
  });
}
