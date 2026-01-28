import { generateObject } from 'ai';
import { z } from 'zod';
import type { EvaluationResult, ProcessableEntry } from './types.ts';

const EvaluationSchema = z.object({
  score: z.number().min(1).max(5).describe('Оценка интересности от 1 до 5'),
  reason: z.string().describe('Краткое обоснование оценки'),
});

export async function evaluateEntry(
  entry: ProcessableEntry,
): Promise<EvaluationResult> {
  const { object } = await generateObject({
    model: 'openai/gpt-5-mini',
    schema: EvaluationSchema,
    system: `Ты эксперт по оценке новостей для IT/tech Telegram-канала.

Оцени новость по шкале от 1 до 5:
- 5: Очень важная новость, затрагивает многих разработчиков
- 4: Интересная новость с практической ценностью
- 3: Средняя новость, может быть интересна части аудитории
- 2: Малоинтересная или узкоспециализированная новость
- 1: Неинтересно, спам или устаревшая информация

Критерии оценки:
- Актуальность и новизна
- Практическая ценность для разработчиков
- Уникальность контента
- Масштаб влияния`,
    prompt: `Оцени эту новость:

Заголовок: ${entry.title}
Источник: ${entry.feed.title}
Дата: ${entry.published_at}

Контент:
${entry.content}`,
  });

  return {
    score: object.score,
    reason: object.reason,
    shouldPublish: object.score >= 4,
  };
}
