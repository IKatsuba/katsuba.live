import { createFxEngine, type FxModelOptions, type FxTool } from 'libfx';
import { env } from '@packages/env';

const MAX_TOOL_CALLS = 12;

export type AgentRun = {
  text: string;
  stopReason: string;
};

export async function runAgent(options: {
  label: string;
  model: FxModelOptions;
  instructions: string | string[];
  tools: FxTool[];
  prompt: string;
}): Promise<AgentRun> {
  const engine = await createFxEngine({
    apiKey: env.AI_GATEWAY_API_KEY,
    model: options.model,
    instructions: options.instructions,
    tools: options.tools,
  });

  try {
    const turn = engine.prompt(options.prompt);
    let text = '';
    let toolCalls = 0;

    for await (const event of turn) {
      if (event.type === 'text_delta') {
        text += event.delta;
      } else if (event.type === 'tool_start') {
        toolCalls++;
        console.log(`[${options.label}] → ${event.name}`);
        if (toolCalls > MAX_TOOL_CALLS) {
          console.error(
            `[${options.label}] Too many tool calls (${toolCalls}), cancelling`,
          );
          turn.cancel();
        }
      } else if (event.type === 'tool_end') {
        console.log(
          `[${options.label}] ← ${event.name}${
            event.isError ? ' (error)' : ''
          }`,
        );
      }
    }

    const { stopReason, usage } = await turn.result;
    console.log(
      `[${options.label}] stop=${stopReason}, in=${
        usage.inputTokens ?? '?'
      }, out=${usage.outputTokens ?? '?'}`,
    );

    return { text, stopReason };
  } finally {
    await engine.close();
  }
}
