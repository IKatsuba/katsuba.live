import { runCronJob } from '../lib/job.js';

// Vercel sends CRON_SECRET as a Bearer token with every cron request; without
// it the endpoint would let anyone trigger a post.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await runCronJob();
  return new Response('OK');
}
