# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Deno monorepo for a cron job that fetches RSS feed entries from
Miniflux API and publishes interesting ones to a Telegram news channel.

## Commands

### Development

```bash
deno task cron:dev               # Run cron job in development mode
```

### Production

```bash
deno task cron:publish           # Run the cron job
```

### Tests

```bash
deno test --allow-env            # Run all tests
```

### Formatting

```bash
deno fmt                         # Format code (uses single quotes)
```

## Architecture

### Workspace Packages (`packages/`)

- **@packages/env**: Centralized environment variables with Zod validation.
  Import `env` to access typed config.
- **@packages/bot**: Grammy Telegram bot instance. Exports `bot` for sending
  messages.

### Apps (`apps/`)

- **webhook**: Cron job that runs every 10 minutes to:
  1. Fetch unread entries from Miniflux API
  2. Evaluate interest using AI (score 1-5, threshold >= 4)
  3. Format and publish one interesting entry to Telegram
  4. Mark processed entries as read
  5. Refresh feeds with parsing errors

## Environment Variables

All variables are validated at startup via `@packages/env`.

Required:

- `BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Target channel for publishing
- `MINIFLUX_API_URL` - Miniflux instance URL (e.g.,
  https://miniflux.example.com)
- `MINIFLUX_API_KEY` - Miniflux API key for X-Auth-Token header
- `AI_GATEWAY_API_KEY` - AI Gateway API key for LLM processing
