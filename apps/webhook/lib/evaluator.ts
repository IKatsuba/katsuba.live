import { z } from 'zod';
import { runAgent } from './agent.ts';
import type { EvaluationResult, ProcessableEntry } from './types.ts';

const EvaluationSchema = z.object({
  score: z.number().int().min(1).max(5).describe('Interest score from 1 to 5'),
  reason: z.string().min(1).describe('Brief justification for the score'),
});

type Evaluation = z.infer<typeof EvaluationSchema>;

export async function evaluateEntry(
  entry: ProcessableEntry,
): Promise<EvaluationResult> {
  let evaluation: Evaluation | null = null;

  await runAgent({
    label: `evaluate:${entry.id}`,
    model: { id: 'anthropic/claude-haiku-5.5', effort: 'low' },
    instructions:
      `You are an expert at evaluating news for an IT/tech Telegram channel.

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
- Scale of impact

Report your rating by calling submit_evaluation exactly once.`,
    tools: [{
      name: 'submit_evaluation',
      description: 'Submits the final interest score and its justification.',
      inputSchema: {
        type: 'object',
        properties: {
          score: { type: 'integer', minimum: 1, maximum: 5 },
          reason: { type: 'string' },
        },
        required: ['score', 'reason'],
        additionalProperties: false,
      },
      idempotent: true,
      execute: (input: unknown) => {
        evaluation = EvaluationSchema.parse(input);
        return 'Evaluation recorded.';
      },
    }],
    prompt: `Evaluate this news:

Title: ${entry.title}
Source: ${entry.feed.title}
Date: ${entry.published_at}

Content:
${entry.content}`,
  });

  if (!evaluation) {
    throw new Error(`Evaluator did not submit a score for entry ${entry.id}`);
  }

  const { score, reason } = evaluation as Evaluation;

  return {
    score,
    reason,
    shouldPublish: score >= 4,
  };
}
