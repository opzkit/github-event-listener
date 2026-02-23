# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun test                         # Run all tests
bun test test/publisher.test.ts  # Run a single test file
bun run lint                     # ESLint check
bun run lint:fix                 # ESLint auto-fix
bun run typecheck                # TypeScript type checking (tsc --noEmit)
```

## Architecture

Key modules:

- `src/config.ts` - Zod v4 schema-validated config from environment variables (uses `zod/v4` import path)
- `src/server.ts` - Bun.serve HTTP server with `/webhook`, `/health`, `/metrics` routes
- `src/webhook/handler.ts` - Octokit webhook handler that bridges events to AMQP publisher
- `src/amqp/connection.ts` - AMQP connection/channel lifecycle with ConfirmChannel; triggers SIGTERM on unexpected disconnect
- `src/amqp/publisher.ts` - Wraps payloads in CloudEvents (`<namespace>.<event>[.<action>].v1`, default namespace `io.opzkit`) and publishes with persistent delivery

**Metrics:** Custom Prometheus-compatible counters (not using prom-client). Three counters: `received_total`, `published_total`, `failed_total`. Exposed at `/metrics`.

## Code Conventions

- ESM modules (`"type": "module"` in package.json)
- Strict TypeScript with `bundler` module resolution
- ESLint enforces `@typescript-eslint/no-floating-promises`
- Tests use `bun:test` (describe/it/expect/mock) in `test/` directory
- AMQP channel mocks use `as never` for type casting
