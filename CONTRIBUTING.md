# Contributing to Front MCP Server

Thank you for your interest in contributing! This guide will help you get started.

## Setup

```bash
git clone https://github.com/wearehoust/front-mcp-server.git
cd front-mcp-server
npm install
npm test  # verify everything works
```

## Development

```bash
npm run test:watch  # run tests in watch mode
npm run lint        # check for lint errors
npm run type-check  # TypeScript strict mode check
npm run build       # compile to dist/
npm run smoke       # smoke test the built server
```

## Architecture

```
src/
  client/       # HTTP client, OAuth, rate limiter, retry engine
  policy/       # Action tier classification, allow/confirm/deny decisions
  services/     # One service per Front API resource (26 total)
  schemas/      # Zod validation schemas per resource
  tools/        # MCP tool registrations (26 tools)
  utils/        # Config loader, logger, sanitizer
```

**Layer dependencies:** Tools -> Services -> Client. No layer may depend on a layer above it.

## Code Standards

- **TypeScript strict mode** — all checks enabled, no `any`, no `ts-ignore`
- **No `console.log`** — stdout is reserved for MCP protocol. Use `Logger` (writes to stderr)
- **No TODO/FIXME/HACK** — every commit is production-final
- **ESLint clean** — zero errors, zero warnings
- **Tests required** — every feature needs tests. Write tests first (TDD preferred)

## Making Changes

1. **Fork and branch** — create a feature branch from `main`
2. **Write tests first** — add failing tests for your change
3. **Implement** — make the tests pass
4. **Gate check** — run all gates before pushing:
   ```bash
   npm run lint && npm run type-check && npm test
   ```
5. **Open a PR** — describe what you changed and why

## Adding a New Resource

If Front adds a new API resource:

1. Add actions to `src/policy/default-policy.ts` with correct tiers
2. Create `src/schemas/<resource>.schema.ts` (follow tags.schema.ts pattern)
3. Create `src/services/<resource>.service.ts` (follow tags.service.ts pattern)
4. Create `src/tools/<resource>.tool.ts` (follow tags.tool.ts pattern)
5. Register in `src/server.ts`
6. Add tests for schema, service, and tool

## Reporting Issues

- **Bugs:** Use the [bug report template](https://github.com/wearehoust/front-mcp-server/issues/new?template=bug_report.md)
- **Features:** Use the [feature request template](https://github.com/wearehoust/front-mcp-server/issues/new?template=feature_request.md)
- **Security:** See [SECURITY.md](SECURITY.md) (do NOT open a public issue)
