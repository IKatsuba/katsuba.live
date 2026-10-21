import { z } from 'zod';
import { runAgent } from './agent.ts';
import { AUDIENCE } from './audience.ts';
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
    model: { id: 'anthropic/claude-haiku-5.5', effort: 'medium' },
    instructions: [
      `You are the editor of an IT/tech Telegram channel and decide which news reaches the readers. Most entries in the feed should not be published: be strict.

Today's date: ${new Date().toISOString().split('T')[0]}`,
      AUDIENCE,
      `Rate the news on a scale from 1 to 5:
- 5: Major news in a core topic that most readers will care about: a major release, a significant language or platform change, an important security issue
- 4: A clearly useful item in a core topic: a notable feature, a deep technical write-up, a tool readers can adopt now
- 3: Relevant but ordinary, or interesting only to a small part of the audience
- 2: Outside the core topics, or of little practical value
- 1: Something the audience does not want, spam, or outdated (older than a month)

Only 4 and 5 get published, so a typical feed should get mostly 1-3. When in doubt between two scores, pick the lower one.

Your own knowledge of versions, release dates and projects is out of date, and the entry's date is the publication date. When your judgment would rest on what you remember rather than on the entry, check it with web_search before scoring: whether a release is current or old, whether a patch release fixes a security vulnerability, what an unfamiliar project is and how widely it is used, or what a too-short entry is about. Don't search when the entry alone is enough to judge it.

Write the reason first, naming the topic and why it does or does not fit the audience, then the score. Report it by calling submit_evaluation exactly once.`,
    ],
    tools: [{ name: 'web_search', providerExecuted: true }, {
      name: 'submit_evaluation',
      description: 'Submits the justification and the final interest score.',
      inputSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          score: { type: 'integer', minimum: 1, maximum: 5 },
        },
        required: ['reason', 'score'],
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
