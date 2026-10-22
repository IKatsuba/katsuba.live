# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

A Vercel cron job that reads unread entries from rssify
(https://rss.katsuba.dev) and publishes interesting ones to a Telegram news
channel. Node.js on Vercel Functions; Bun is the package manager.

## Commands

```bash
bun install
bun run cron:dev                 # One cron run locally, env from .env and .env.local
bun run typecheck                # tsc
bun run format                   # prettier (single quotes)
```

## Architecture

- `api/cron.ts`: the Vercel Function that Vercel Cron calls every 10 minutes
  (`vercel.json`). Rejects requests without `Authorization: Bearer
  $CRON_SECRET`.
- `lib/job.ts`: one run:
  1. List unread entries from rssify, oldest first
  2. Evaluate interest with an AI agent (score 1-5, threshold >= 4)
  3. Write and publish one interesting entry to Telegram
  4. Mark processed entries read in rssify
- `lib/rssify.ts`: rssify `/api/v1` client (`x-api-key`) and the full-article
  fetch (Readability) for the writer.
- `lib/evaluator.ts`, `lib/llm.ts`, `lib/agent.ts`: libfx agents on Claude via
  AI Gateway.
- `lib/env.ts`: environment variables with Zod validation.

Relative imports use the `.js` extension (`moduleResolution: NodeNext`).
`vercel.json` includes `node_modules/libfx/**` in the function, because its
native binary and wasm are loaded at runtime and are not traced.

## Environment Variables

Validated at startup via `lib/env.ts`:

- `BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Target channel for publishing
- `RSSIFY_API_URL` - rssify instance URL (https://rss.katsuba.dev)
- `RSSIFY_API_KEY` - rssify API key, sent as `x-api-key`
- `AI_GATEWAY_API_KEY` - optional AI Gateway key; without it the Vercel OIDC
  token is used (`VERCEL_OIDC_TOKEN` locally, from `vercel env pull`)

Checked by `api/cron.ts` only:

- `CRON_SECRET` - Vercel sends it as a Bearer token with each cron request
