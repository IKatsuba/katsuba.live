import { generateObject } from 'ai';
import { z } from 'zod';
import type { EvaluationResult, ProcessableEntry } from './types.ts';

const EvaluationSchema = z.object({
  score: z.number().min(1).max(5).describe('Interest score from 1 to 5'),
  reason: z.string().describe('Brief justification for the score'),
});

export async function evaluateEntry(
  entry: ProcessableEntry,
): Promise<EvaluationResult> {
  const { object } = await generateObject({
    model: 'openai/gpt-5-mini',
    schema: EvaluationSchema,
    system: `You are an expert at evaluating news for an IT/tech Telegram channel.

Today's date: ${new Date().toISOString().split('T')[0]}

Rate the news on a scale from 1 to 5:
- 5: Very important news affecting many developers
- 4: Interesting news with practical value
- 3: Average news, may interest part of the audience
- 2: Low-interest or highly specialized news
- 1: Not interesting, spam, or outdated information

Evaluation criteria:
- Relevance and freshness (news older than a month loses value)
- Practical value for developers
- Content uniqueness
- Scale of impact`,
    prompt: `Evaluate this news:

Title: ${entry.title}
Source: ${entry.feed.title}
Date: ${entry.published_at}

Content:
${entry.content}`,
  });

  return {
    score: object.score,
    reason: object.reason,
    shouldPublish: object.score >= 4,
  };
}
