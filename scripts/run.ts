// One cron run on this machine: `bun run cron:dev`.
import { runCronJob } from '../lib/job.js';

await runCronJob();
