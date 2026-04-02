# Technical Spec: Front MCP Server

## Architecture

Three-layer modular architecture with strict unidirectional dependencies:

```
┌──────────────────────────────────────────────────────────┐
│  MCP Layer                                               │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Tools   │→ │ Policy Engine │→ │ Schema Validation  │  │
│  │ (25 files)│  │ (allow/confirm│  │ (Zod per action)   │  │
│  │          │  │  /deny)       │  │                    │  │
│  └─────────┘  └──────────────┘  └────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Service Layer                                           │
│  ┌────────────────────────┐  ┌────────────────────────┐  │
│  │  Resource Services     │  │  Shared Utilities      │  │
│  │  (25 files, one per    │  │  - Pagination helper   │  │
│  │   Front resource)      │  │  - Response formatter  │  │
│  └────────────────────────┘  └────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Client Layer                                            │
│  ┌──────────┐ ┌─────────┐ ┌───────────┐ ┌────────────┐  │
│  │  Front   │ │  OAuth   │ │   Rate    │ │   Retry    │  │
│  │  Client  │ │  Manager │ │  Limiter  │ │   Engine   │  │
│  └──────────┘ └─────────┘ └───────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Dependency rule:** Tools -> Services -> Client. No layer may depend on a layer above it.

---

## Technology Stack

| Component | Choice | Rationale |
|---|---|---|
| Language | TypeScript 5.x (strict mode) | MCP SDK primary language, Zod integration |
| Runtime | Node.js >= 20 LTS | Stable, crypto built-in, no native deps needed |
| MCP SDK | `@modelcontextprotocol/sdk` latest | Official SDK, stdio transport built-in |
| HTTP Client | Native `fetch` (Node 20+ built-in) | Zero external HTTP deps. Uses undici internally. |
| Schema Validation | `zod` | Runtime validation + MCP tool schema generation |
| Token Encryption | Node.js `crypto` (built-in) | AES-256-GCM, no external crypto dependency |
| OAuth HTTP server | Node.js `http` (built-in) | Temporary localhost callback, no framework needed |
| Testing | `vitest` | Fast, TypeScript-native, good mocking |
| Linting | `eslint` + `typescript-eslint` | Strict rules, security-focused config |

**Dependency philosophy:** Minimize external dependencies. Prefer Node.js built-ins. Every dependency is a security surface.

---

## Key Design Decisions

### D-1: Compound Tools with Action Parameter

Each Front resource becomes one MCP tool with an `action` discriminated union. Example:

```typescript
// conversations.tool.ts
{
  name: "conversations",
  description: "Manage Front conversations — list, search, get details, update, assign, tag, and more.",
  inputSchema: z.discriminatedUnion("action", [
    z.object({
      action: z.literal("list"),
      inbox_id: z.string().optional(),
      status: z.enum(["open", "archived", "deleted", "spam"]).optional(),
      limit: z.number().min(1).max(100).default(50).optional(),
      page_token: z.string().optional(),
    }),
    z.object({
      action: z.literal("get"),
      conversation_id: z.string(),
    }),
    z.object({
      action: z.literal("search"),
      query: z.string(),
      limit: z.number().min(1).max(100).default(25).optional(),
      page_token: z.string().optional(),
    }),
    z.object({
      action: z.literal("assign"),
      conversation_id: z.string(),
      assignee_id: z.string(),
      confirm: z.boolean().optional(),
    }),
    // ... more actions
  ]),
}
```

**Rationale:** ~25 tools is manageable for any LLM. The discriminated union gives strict per-action validation. The `action` field is self-documenting.

### D-2: Policy Engine with Confirmation Flow

```typescript
// policy/types.ts
type ActionTier = "read" | "write" | "destructive";
type PolicyDecision = "allow" | "confirm" | "deny";

interface PolicyRule {
  tool: string;          // e.g., "conversations"
  action: string;        // e.g., "assign" or "*" for all actions
  decision: PolicyDecision;
}

interface PolicyConfig {
  defaults: Record<ActionTier, PolicyDecision>;
  overrides: PolicyRule[];
}
```

**Confirmation flow:**

1. LLM calls `conversations` tool with `action: "assign"`.
2. Policy engine classifies `assign` as `write` tier -> default decision is `confirm`.
3. Tool returns: `{ isError: false, content: [{ type: "text", text: "CONFIRMATION REQUIRED: Assign conversation cnv_123 to teammate tea_456. Call this tool again with confirm: true to proceed." }] }`
4. LLM calls again with `confirm: true` -> policy engine allows, service executes.

**Default tier classifications:**

| Tier | Actions |
|---|---|
| `read` | list, get, search, list_*, get_* |
| `write` | create, update, assign, add_*, tag, reply, mark_seen, merge |
| `destructive` | delete, remove_*, archive (conversations) |

### D-3: OAuth Token Lifecycle

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ First Run   │────>│ Open Browser │────>│ User Approves│
│ No tokens   │     │ /oauth/auth  │     │ at Front.com │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                    ┌──────────────┐     ┌───────▼───────┐
                    │ Store Tokens │<────│ Exchange Code │
                    │ (encrypted)  │     │ for Tokens    │
                    └──────┬───────┘     └───────────────┘
                           │
                    ┌──────▼───────┐
                    │ Normal Use   │◄─────────────────┐
                    │ Bearer token │                   │
                    └──────┬───────┘                   │
                           │                           │
                    ┌──────▼───────┐     ┌─────────────┤
                    │ Token Expired│────>│ Refresh      │
                    │ (60 min)     │     │ Silently     │
                    └──────────────┘     └─────────────┘
```

**Token storage format:**

```json
{
  "version": 1,
  "encrypted": true,
  "algorithm": "aes-256-gcm",
  "data": "<base64-encrypted-blob>",
  "iv": "<base64-iv>",
  "tag": "<base64-auth-tag>",
  "created_at": "2026-04-02T00:00:00Z",
  "refresh_expires_at": "2026-10-02T00:00:00Z"
}
```

**Encryption key derivation:** PBKDF2 from a combination of machine ID (hostname + username + OS) and a user-provided passphrase (optional, prompted on first setup). Falls back to machine-ID-only derivation if no passphrase is set, with a warning.

### D-4: Rate Limiter Architecture

In-memory rate limiter that tracks state from Front's response headers:

```typescript
interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number;           // Unix timestamp
  burstLimit: number;
  burstRemaining: number;
  tierLimits: Map<string, {  // Per-endpoint tier tracking
    maxPerSecond: number;
    lastRequestAt: number;
  }>;
}
```

**Strategy:**
1. Before each request: check `remaining`. If < 10% of `limit`, delay until `resetAt`.
2. Check tier-specific limits (analytics = 1/sec, search = 40% global rate).
3. After each response: update state from headers.
4. On 429: parse `retry-after`, apply exponential backoff (base 1s, max 60s, jitter).

### D-5: Error Mapping

Front API errors are mapped to structured MCP responses:

| Front HTTP Status | MCP Handling |
|---|---|
| 200-299 | Success, return formatted data |
| 400 | Tool error: invalid parameters, include Front's error message |
| 401 | Tool error: auth expired, trigger token refresh and retry once |
| 403 | Tool error: insufficient scope, suggest required scope |
| 404 | Tool error: resource not found, include ID searched |
| 409 | Tool error: conflict, include details |
| 429 | Retry with backoff, only error after max retries exhausted |
| 500-599 | Tool error: Front API issue, suggest retry later |

### D-6: Output Sanitization

A field-level redaction system applied before MCP response:

```typescript
interface SanitizationConfig {
  enabled: boolean;
  redactedFields: string[];      // Field names to redact at any depth
  redactedPatterns: RegExp[];    // Regex patterns in string values to redact
  replacementText: string;       // Default: "[REDACTED]"
}

// Default redacted fields (exact match, case-insensitive)
// NOTE: "token" is intentionally NOT here — it would redact page_token in pagination.
const DEFAULT_REDACTED_FIELDS = [
  "phone",
  "phone_number",
  "social_security",
  "credit_card",
  "password",
  "secret",
  "api_key",
  "access_token",
  "refresh_token",
  "client_secret",
];
```

Sanitization walks the response object recursively. Field names are matched case-insensitively. Patterns are applied to string values. This runs in the MCP layer, after the service returns data but before the tool returns to the client.

---

## Data Flow

### Successful Read Operation

```
LLM calls: conversations { action: "list", status: "open", limit: 10 }
  │
  ▼
MCP Layer: Zod validates input schema
  │
  ▼
Policy Engine: classify "list" as "read" tier -> decision: "allow"
  │
  ▼
Service Layer: conversations.service.list({ status: "open", limit: 10 })
  │
  ▼
Client Layer: GET https://api2.frontapp.com/conversations?q[statuses][]=open&limit=10
  │  ├── Rate limiter: check remaining, check tier limit
  │  ├── Auth: inject Bearer token (refresh if expired)
  │  └── Retry: on failure, exponential backoff
  │
  ▼
Response: { _results: [...], _pagination: { next: "..." } }
  │
  ▼
Service Layer: format response, extract pagination token
  │
  ▼
MCP Layer: sanitize output, build MCP tool result
  │
  ▼
LLM receives: { content: [{ type: "text", text: "Found 10 open conversations..." }],
                structuredContent: { conversations: [...], next_page_token: "..." } }
```

### Write Operation with Confirmation

```
LLM calls: messages { action: "create", conversation_id: "cnv_123", body: "Hello" }
  │
  ▼
Policy Engine: classify "create" as "write" -> decision: "confirm"
  │
  ▼
Tool returns: "CONFIRMATION REQUIRED: Send message to conversation cnv_123.
              Body preview: 'Hello'. Call again with confirm: true to proceed."
  │
  ▼
LLM calls: messages { action: "create", conversation_id: "cnv_123", body: "Hello", confirm: true }
  │
  ▼
Policy Engine: confirm: true present -> allow execution
  │
  ▼
Service -> Client -> Front API -> Response -> Formatted result
```

---

## File-Level Specifications

### src/index.ts

Entry point. Responsibilities:
- Parse CLI arguments (`front-mcp` for normal operation, `front-mcp auth` for OAuth setup)
- Load config from file + env vars
- Initialize the FrontClient with auth
- Initialize the MCP Server with stdio transport
- Register all tools
- Start the server

### src/server.ts

MCP server setup:
- Creates `McpServer` instance with server info and capabilities
- Iterates all tool files, calls their registration function
- Passes shared dependencies (FrontClient, PolicyEngine, config) to each tool

### src/client/front-client.ts

Central HTTP client:
- Wraps native `fetch` (Node 20+) with auth header injection
- Methods: `get()`, `post()`, `patch()`, `put()`, `delete()`
- Each method accepts path (relative to `https://api2.frontapp.com`) and optional body/params
- Integrates rate limiter (pre-request check) and retry engine (post-failure)
- Returns typed responses or throws structured errors

### src/client/oauth.ts

OAuth flow manager:
- `startAuthFlow()`: starts local HTTP server on random port, opens browser to Front auth URL
- `handleCallback(code)`: exchanges code for tokens via POST to `https://app.frontapp.com/oauth/token`
- `refreshToken()`: refreshes access token using refresh token
- `isTokenExpired()`: checks current access token expiry
- `getAccessToken()`: returns valid token, refreshing if needed
- Uses `token-store.ts` for persistence

### src/client/token-store.ts

Encrypted token persistence:
- `save(tokens)`: encrypts and writes to `~/.front-mcp/tokens.enc`
- `load()`: reads and decrypts tokens
- `clear()`: securely deletes token file
- File permissions set to 0600 on write
- Encryption: AES-256-GCM with PBKDF2-derived key

### src/client/rate-limiter.ts

In-memory rate limit tracker:
- `checkBeforeRequest(endpoint)`: returns delay in ms (0 if OK to proceed)
- `updateFromResponse(headers)`: parses rate limit headers, updates state
- `handleRateLimit(retryAfter)`: tracks 429 state
- Tier-specific tracking for analytics, search, conversation endpoints

### src/client/retry.ts

Retry engine:
- `withRetry(fn, options)`: wraps an async function with retry logic
- Exponential backoff: base 1s, factor 2, max 60s, with jitter
- Respects `retry-after` header when present
- Max retries: 3 (configurable)
- Only retries on: 429, 500, 502, 503, 504, network errors
- Never retries on: 400, 401, 403, 404, 409

### src/policy/engine.ts

Policy enforcement:
- `evaluate(tool, action, params)`: returns `{ decision, message? }`
- Loads policy from config file, merges with defaults
- Action tier classification based on action name patterns
- Confirmation tracking: stores pending confirmations in memory with TTL

### src/services/*.service.ts

Each service file:
- Receives `FrontClient` as constructor parameter
- One method per API action (e.g., `list()`, `get()`, `create()`)
- Handles parameter mapping from our schema to Front's API format
- Handles pagination parameter passing
- Returns typed response objects
- No MCP awareness — pure Front API logic

### src/tools/*.tool.ts

Each tool file exports a registration function:

```typescript
export function registerConversationsTool(
  server: McpServer,
  service: ConversationsService,
  policy: PolicyEngine,
  sanitizer: Sanitizer,
): void {
  server.tool(
    "conversations",
    "Manage Front conversations — list, search, get details, update, assign, tag, and more.",
    ConversationsInputSchema,  // Zod discriminated union
    async (params) => {
      // 1. Policy check
      const decision = policy.evaluate("conversations", params.action, params);
      if (decision.decision === "deny") return errorResult(decision.message);
      if (decision.decision === "confirm" && !params.confirm) return confirmResult(decision.message);

      // 2. Call service
      const result = await service[params.action](params);

      // 3. Sanitize and return
      return formatResult(sanitizer.sanitize(result));
    },
  );
}
```

### src/schemas/*.schema.ts

Zod schemas per resource. Each file exports:
- The discriminated union schema for the tool input
- Individual action schemas (reusable in tests)
- TypeScript types inferred from schemas

### src/utils/logger.ts

Structured JSON logger to stderr:
- Levels: error, warn, info, debug
- Each log entry: `{ level, timestamp, message, ...context }`
- Automatic redaction of sensitive fields in context objects
- Configurable via `LOG_LEVEL` env var

### src/utils/config.ts

Configuration loader:
- Reads `~/.front-mcp/config.json` (with XDG fallback)
- Merges with env vars (prefix `FRONT_MCP_`, e.g., `FRONT_MCP_LOG_LEVEL`)
- Validates final config with Zod schema
- Returns typed config object

### src/utils/sanitize.ts

Output sanitizer:
- `sanitize(obj)`: deep-walks object, redacts configured fields
- Configurable field names and regex patterns
- Applied in MCP layer before returning tool results

---

## Security Architecture

### Threat Model

| Threat | Mitigation |
|---|---|
| Token theft from disk | AES-256-GCM encryption, 0600 file perms |
| Token leakage in logs | Redaction in logger, never log auth headers |
| Token leakage in MCP responses | Sanitizer strips token-like fields |
| Excessive LLM actions | Policy engine with confirm/deny tiers |
| LLM sending unintended messages | Write operations require confirmation by default |
| LLM deleting data | Destructive operations denied by default |
| Front API credential in env var | Warning logged, docs recommend OAuth |
| Man-in-the-middle | HTTPS enforced, no HTTP fallback |
| Dependency supply chain | Minimal deps, pinned versions, lockfile |
| Prompt injection via Front data | Sanitizer + LLM client is responsible for this |
| Rate limit abuse | Client-side rate limiter tracks headers |

### Principle of Least Privilege

- OAuth scopes requested match only what the user configures
- Default policy denies destructive operations
- Token file is readable only by the owning user
- Server process needs no elevated privileges

---

## Configuration Schema

```json
{
  "$schema": "front-mcp-config",
  "auth": {
    "method": "oauth",
    "oauth": {
      "client_id": "your-app-client-id",
      "client_secret_env": "FRONT_MCP_OAUTH_SECRET",
      "redirect_port": 9876,
      "scopes": ["shared:*:read", "shared:*:write"]
    },
    "api_token_env": "FRONT_API_TOKEN"
  },
  "logging": {
    "level": "info",
    "redact_fields": ["phone", "email", "token", "password"]
  },
  "rate_limit": {
    "proactive_delay_threshold": 0.1,
    "max_retries": 3,
    "backoff_base_ms": 1000,
    "backoff_max_ms": 60000
  },
  "pagination": {
    "default_limit": 50,
    "max_auto_paginate_pages": 10
  },
  "sanitization": {
    "enabled": true,
    "redacted_fields": [],
    "redacted_patterns": [],
    "replacement_text": "[REDACTED]"
  },
  "policy_file": "~/.front-mcp/policy.json"
}
```

---

## MCP Client Configuration

Example Claude Code `~/.claude/settings.json` entry:

```json
{
  "mcpServers": {
    "front": {
      "command": "npx",
      "args": ["-y", "front-mcp-server"],
      "env": {
        "FRONT_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Or for OAuth (recommended):

```json
{
  "mcpServers": {
    "front": {
      "command": "npx",
      "args": ["-y", "front-mcp-server"],
      "env": {
        "FRONT_MCP_AUTH_METHOD": "oauth"
      }
    }
  }
}
```
