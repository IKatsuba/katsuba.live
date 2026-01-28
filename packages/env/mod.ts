import { z } from 'zod';

const envSchema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().min(1, 'TELEGRAM_CHAT_ID is required'),

  // Miniflux API
  MINIFLUX_API_URL: z.string().url('MINIFLUX_API_URL must be a valid URL'),
  MINIFLUX_API_KEY: z.string().min(1, 'MINIFLUX_API_KEY is required'),

  // AI
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY is required'),
});

function getEnvObject(): Record<string, string | undefined> {
  return {
    BOT_TOKEN: Deno.env.get('BOT_TOKEN'),
    TELEGRAM_CHAT_ID: Deno.env.get('TELEGRAM_CHAT_ID'),
    MINIFLUX_API_URL: Deno.env.get('MINIFLUX_API_URL'),
    MINIFLUX_API_KEY: Deno.env.get('MINIFLUX_API_KEY'),
    AI_GATEWAY_API_KEY: Deno.env.get('AI_GATEWAY_API_KEY'),
  };
}

const result = envSchema.safeParse(getEnvObject());

if (!result.success) {
  console.error('Invalid environment variables:');
  for (const error of result.error.errors) {
    console.error(`  - ${error.path.join('.')}: ${error.message}`);
  }
  Deno.exit(1);
}

export const env = result.data;
