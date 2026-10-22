import { z } from 'zod';

const envSchema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().min(1, 'TELEGRAM_CHAT_ID is required'),

  // rssify API
  RSSIFY_API_URL: z.string().url('RSSIFY_API_URL must be a valid URL'),
  RSSIFY_API_KEY: z.string().min(1, 'RSSIFY_API_KEY is required'),

  // AI
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY is required'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const problems = result.error.errors.map(
    (error) => `  - ${error.path.join('.')}: ${error.message}`,
  );
  throw new Error(`Invalid environment variables:\n${problems.join('\n')}`);
}

export const env = result.data;
