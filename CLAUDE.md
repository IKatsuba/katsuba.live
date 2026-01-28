# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Deno monorepo for a webhook server that receives RSS feed entries from
Miniflux and publishes them to a Telegram news channel.

## Commands

### Development

```bash
deno task webhook:dev            # Run webhook server in development mode
```

### Production

```bash
deno task webhook                # Run the webhook server
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

- **@packages/bot**: Grammy Telegram bot instance. Exports `bot` for sending
  messages.

### Apps (`apps/`)

- **webhook**: HTTP server that receives Miniflux webhook notifications,
  processes entries with LLM for Telegram formatting, and posts to a Telegram
  channel.
  - `GET /health` - Health check endpoint
  - `POST /webhook` - Miniflux webhook endpoint (validates HMAC signature)

## Environment Variables

Required:

- `BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Target channel for publishing
- `WEBHOOK_SECRET` - Miniflux webhook secret for HMAC-SHA256 signature
  validation

Optional:

- `PORT` - Server port (default: 8000)
