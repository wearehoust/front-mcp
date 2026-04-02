# Implementation Plan: Front MCP Server

## Milestone Dependency Graph

```
M1 (Project Scaffold + Client Layer)
 │
 ├──► M2 (Policy Engine)
 │     │
 │     └──► M4 (MCP Tool Layer - first 5 resources)
 │           │
 │           └──► M6 (MCP Tool Layer - remaining 20 resources)
 │                 │
 │                 └──► M8 (README, npm publish config, final polish)
 │
 ├──► M3 (Service Layer - first 5 core resources)
 │     │
 │     └──► M4 (MCP Tool Layer - first 5 resources)
 │
 ├──► M5 (Service Layer - remaining 20 resources)
 │     │
 │     └──► M6 (MCP Tool Layer - remaining 20 resources)
 │
 └──► M7 (OAuth Flow)
       │
       └──► M8 (Final polish)
```

---

## Milestone 1: Project Scaffold + Client Layer

**Goal:** Working project with HTTP client, auth, rate limiting, retry, config, logging. No MCP yet — just a tested foundation.

### Tasks

1. **Initialize project**
   - `npm init`, `tsconfig.json` (strict: true, all checks on), `.gitignore`, `eslint` config
   - Add dependencies: `@modelcontextprotocol/sdk`, `zod` (HTTP via native `fetch`, no axios)
   - Add dev dependencies: `vitest`, `msw`, `typescript`, `eslint`, `typescript-eslint`
   - Pin all dependency versions exactly (no `^` or `~`)

2. **Config loader (`src/utils/config.ts`)**
   - Load from `~/.front-mcp/config.json` with XDG fallback
   - Env var overrides with `FRONT_MCP_` prefix
   - Zod schema validation of config
   - Sensible defaults for all fields
   - Tests: file loading, env override, defaults, invalid config rejection

3. **Logger (`src/utils/logger.ts`)**
   - Structured JSON to stderr
   - Levels: error, warn, info, debug
   - Sensitive field redaction in context objects
   - Tests: level filtering, redaction, stderr-only output

4. **Sanitizer (`src/utils/sanitize.ts`)**
   - Deep object walk, field name matching, regex pattern matching
   - Configurable field list and patterns
   - Tests: flat objects, nested objects, arrays, edge cases (circular refs, null)

5. **Front HTTP client (`src/client/front-client.ts`)**
   - Wraps native `fetch` with `https://api2.frontapp.com` base URL
   - Bearer token injection from auth provider
   - Methods: `get()`, `post()`, `patch()`, `put()`, `delete()`
   - Integrates rate limiter and retry engine
   - Tests: header injection, method routing, error propagation

6. **Rate limiter (`src/client/rate-limiter.ts`)**
   - Parse rate limit headers from responses
   - Proactive delay when remaining < 10%
   - Burst tracking (50% of limit, 10-min window)
   - Tier-specific limits (analytics, search, conversations)
   - Tests: header parsing, delay calculation, burst tracking, tier limits

7. **Retry engine (`src/client/retry.ts`)**
   - Exponential backoff with jitter
   - Respect `retry-after` header
   - Configurable max retries (default 3)
   - Only retry on 429, 5xx, network errors
   - Tests: backoff timing, retry-after respect, non-retryable status codes

8. **API token auth (`src/client/front-client.ts`)**
   - Read `FRONT_API_TOKEN` from env
   - Inject as Bearer header
   - Log warning when using API token instead of OAuth
   - Tests: token injection, missing token error

### Acceptance Criteria
- `npm run build` succeeds with zero errors/warnings
- `npm run lint` passes
- `npm run test` passes with all unit tests green
- FrontClient can make authenticated GET requests to Front API (manual verification with real token)
- Rate limiter correctly parses real Front API response headers

---

## Milestone 2: Policy Engine

**Goal:** Configurable allow/confirm/deny policy enforcement, ready to plug into tools.

### Tasks

1. **Policy types (`src/policy/types.ts`)**
   - `ActionTier`, `PolicyDecision`, `PolicyRule`, `PolicyConfig` types
   - Zod schemas for policy config validation

2. **Default policy (`src/policy/default-policy.ts`)**
   - Tier classification for every action across all 25 resources
   - Default decisions: read=allow, write=confirm, destructive=deny
   - Export as typed constant

3. **Policy engine (`src/policy/engine.ts`)**
   - `evaluate(tool, action, params)` method
   - Load policy from config file, merge with defaults
   - Override precedence: specific action > tool wildcard > tier default
   - Confirmation tracking with in-memory Map + TTL (5 min)
   - Tests: every tier classification, override precedence, confirmation flow, deny messaging, unknown action defaults to write

### Acceptance Criteria
- Every action across all 25 resources has a default tier classification
- Policy engine correctly resolves overrides
- Confirmation flow works (first call returns prompt, second with confirm=true proceeds)
- Denied actions return clear error with instructions to change policy

---

## Milestone 3: Service Layer — Core Resources (5)

**Goal:** Service files for the 5 most important resources, with full API coverage.

### Resources (in order)
1. `conversations.service.ts` — list, get, search, create, update, delete, assign, followers, tags, links, messages, reminders, inboxes, events
2. `messages.service.ts` — get, create, reply, import, receive_custom, seen_status, mark_seen
3. `contacts.service.ts` — list, get, create, update, delete, merge, list_conversations, handles
4. `tags.service.ts` — list, get, create, update, delete, children, list_conversations
5. `inboxes.service.ts` — list, get, create, list_channels, list_conversations, access management

### Tasks per service

1. **Zod schemas (`src/schemas/<resource>.schema.ts`)**
   - Discriminated union for tool input
   - Individual action schemas
   - Common schemas (`src/schemas/common.schema.ts`): pagination params, ID formats

2. **Pagination helper (`src/services/pagination.ts`)**
   - `paginate(client, path, params)`: single page fetch with token extraction
   - `autoPaginate(client, path, params, maxPages)`: multi-page fetch
   - Tests: single page, multi-page, max pages limit

3. **Service implementation**
   - One method per action
   - Parameter mapping to Front API format
   - Pagination parameter passing
   - Tests: each action with fixture data via msw

### Acceptance Criteria
- All 5 services have complete action coverage matching the requirements table
- Zod schemas reject invalid inputs with clear error messages
- Pagination helper correctly follows cursor chains
- 85%+ coverage on service layer

---

## Milestone 4: MCP Tool Layer — Core Resources (5)

**Goal:** Working MCP server with 5 tools registered, policy enforcement, and sanitized output.

### Tasks

1. **Server setup (`src/server.ts`)**
   - Create McpServer instance with capabilities
   - Tool registration orchestrator pattern
   - Pass shared dependencies to tool registration functions

2. **Entry point (`src/index.ts`)**
   - CLI argument parsing (`front-mcp` vs `front-mcp auth`)
   - Config loading, client init, server init
   - Stdio transport setup and start

3. **Tool registration (5 tool files)**
   - Each tool: schema validation -> policy check -> service call -> sanitize -> format response
   - MCP tool annotations (readOnlyHint, destructiveHint) based on action tier
   - Structured content + text summary in responses
   - Confirmation flow integration

4. **Response formatter**
   - Converts service results to MCP tool result format
   - Text summary generation for LLM consumption
   - Structured content with full API response data

5. **Integration tests**
   - Full tool lifecycle: register, call, validate, policy, respond
   - Error mapping from Front API errors to MCP tool errors
   - Confirmation flow end-to-end

### Acceptance Criteria
- `front-mcp` starts, connects via stdio, responds to `tools/list`
- All 5 tools appear with correct descriptions and schemas
- Read actions return data, write actions require confirmation, delete actions are denied
- Error responses are structured and actionable
- No tokens or sensitive data in any MCP response

---

## Milestone 5: Service Layer — Remaining Resources (20)

**Goal:** Service files for all remaining 20 resources.

### Resources
6. `accounts.service.ts`
7. `analytics.service.ts`
8. `channels.service.ts`
9. `comments.service.ts`
10. `contact-groups.service.ts`
11. `contact-lists.service.ts`
12. `contact-notes.service.ts`
13. `custom-fields.service.ts`
14. `drafts.service.ts`
15. `events.service.ts`
16. `knowledge-bases.service.ts`
17. `links.service.ts`
18. `message-template-folders.service.ts`
19. `message-templates.service.ts`
20. `rules.service.ts`
21. `shifts.service.ts`
22. `signatures.service.ts`
23. `teammate-groups.service.ts`
24. `teammates.service.ts`
25. `teams.service.ts`

### Tasks per resource
1. Zod schema file
2. Service implementation (all actions)
3. Unit tests with fixtures

**Note:** These follow the exact same pattern established in M3. Highly parallelizable — multiple resources can be implemented simultaneously by subagents.

### Acceptance Criteria
- All 20 services have complete action coverage
- All schemas validate correctly
- 85%+ coverage on service layer

---

## Milestone 6: MCP Tool Layer — Remaining Resources (20)

**Goal:** All 25 tools registered and working.

### Tasks per resource
1. Tool registration file (same pattern as M4)
2. Integration test per tool

**Note:** Same pattern as M4, highly parallelizable.

### Acceptance Criteria
- `tools/list` returns all 25 tools (+ `token_identity`)
- Every tool's every action works end-to-end (schema -> policy -> service -> response)
- All policy tiers applied correctly across all 200+ actions

---

## Milestone 7: OAuth Flow

**Goal:** Full OAuth authorization code flow with encrypted token storage.

### Tasks

1. **Token store (`src/client/token-store.ts`)**
   - AES-256-GCM encryption with PBKDF2 key derivation
   - File-level operations: save, load, clear
   - 0600 file permissions enforcement
   - Tests: encrypt/decrypt roundtrip, corruption handling, permissions

2. **OAuth manager (`src/client/oauth.ts`)**
   - Local HTTP callback server (random port)
   - Browser launch for authorization
   - Code-to-token exchange with Basic auth
   - Token refresh flow
   - Refresh token expiry warning (24-hour window)
   - Tests: full flow with mocked endpoints, refresh, expiry detection

3. **Auth CLI command**
   - `front-mcp auth` triggers OAuth setup
   - `front-mcp auth --status` shows current auth state
   - `front-mcp auth --clear` removes stored tokens

4. **Integration with FrontClient**
   - Auto-detect auth method (OAuth tokens present -> use them, else check env var)
   - Transparent token refresh on 401 (retry request once after refresh)

### Acceptance Criteria
- `front-mcp auth` opens browser, completes OAuth, stores encrypted tokens
- Tokens survive server restart (loaded from encrypted file)
- Expired access token triggers silent refresh
- Near-expiry refresh token triggers warning
- `front-mcp auth --status` shows token state without revealing token values
- Token file has 0600 permissions

---

## Milestone 8: Documentation + Polish

**Goal:** Production-ready for GitHub publish and npm.

### Tasks

1. **README.md**
   - Project description and motivation
   - Quick start (API token in 30 seconds)
   - OAuth setup guide
   - Claude Code configuration snippet
   - Full tool reference (all 25 tools with available actions)
   - Policy configuration guide
   - Security model overview
   - Contributing guide

2. **npm publish configuration**
   - `package.json`: name, version, description, keywords, bin entry
   - `prepublishOnly` script: lint + type-check + test + build
   - `.npmignore`: exclude tests, fixtures, specs, docs
   - `LICENSE` (MIT)

3. **Example config files**
   - `config/config.example.json` with all options documented
   - `config/default-policy.json` with all actions and their tiers

4. **Final audit**
   - Run `npm audit` on dependencies
   - Verify no secrets in any committed file
   - Verify stdout is clean (only MCP protocol, no stray logs)
   - Verify all tests pass, coverage meets targets
   - Manual end-to-end test with real Front account

### Acceptance Criteria
- README is complete and accurate
- `npm pack` produces clean package
- `npx front-mcp-server` works out of the box with an API token
- All CI gates pass
- Manual smoke test with Claude Code succeeds

---

## Implementation Notes

### Parallelization Strategy

Milestones 5 and 6 (remaining 20 resources) are highly parallelizable. Each resource (schema + service + tool + tests) is independent. These can be distributed across subagents:

- **Batch A (5 resources):** accounts, analytics, channels, comments, contact-groups
- **Batch B (5 resources):** contact-lists, contact-notes, custom-fields, drafts, events
- **Batch C (5 resources):** knowledge-bases, links, message-template-folders, message-templates, rules
- **Batch D (5 resources):** shifts, signatures, teammate-groups, teammates, teams

### Pattern Consistency

All 25 resources follow the exact same structural pattern:
1. Schema file with discriminated union
2. Service file with one method per action
3. Tool file with policy -> service -> sanitize -> format flow
4. Unit test file with fixture-based tests

Once the pattern is established in M3/M4 with the first 5, the remaining 20 are mechanical.

### Risk Areas

| Risk | Mitigation |
|---|---|
| Front API undocumented behavior | Test with real API early (M1), capture response fixtures |
| OAuth flow browser launch on headless | Provide manual code entry fallback |
| Token encryption key portability | Document that tokens are machine-bound, re-auth needed on new machine |
| 200+ actions correctness | Automated test per action, fixture per endpoint |
| MCP SDK breaking changes | Pin SDK version, test on update |
