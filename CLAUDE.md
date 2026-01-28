# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Deno monorepo for a cron job that publishes RSS feed entries to a
Telegram news channel.

## Commands

### Development

```bash
deno task cron:publish:dev       # Run publish cron in development mode
```

### Production

```bash
deno task cron:publish           # Run the publish cron job once
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

- **@packages/miniflux**: Client for Miniflux RSS reader API. Used by the publish
  cron to fetch unread entries.

### Cron Jobs (`crons/`)

- **publish**: Fetches unread entries from Miniflux, processes them with LLM for
  Telegram formatting, and posts to a Telegram channel.

## Environment Variables

Required:

- `BOT_TOKEN` - Telegram bot token
- `MINIFLUX_URL` - Miniflux server URL
- `MINIFLUX_TOKEN` - Miniflux API token
- `TELEGRAM_CHAT_ID` - Target channel for publishing
