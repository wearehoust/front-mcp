# Testing Spec: Front MCP Server

## Test Framework

| Component | Choice | Rationale |
|---|---|---|
| Runner | vitest | Fast, TypeScript-native, built-in mocking |
| Mocking | vitest mocks + msw | msw for HTTP-level Front API mocking |
| Coverage | v8 (via vitest) | Built-in, no extra dependency |
| Assertions | vitest built-in (expect) | Standard, no extra dependency |

---

## Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| Client Layer | 90% | Critical security surface (auth, rate limiting, retry) |
| Service Layer | 85% | API mapping logic, pagination handling |
| MCP/Tool Layer | 80% | Integration between policy, service, and formatting |
| Policy Engine | 95% | Safety-critical: wrong decision = data loss or unauthorized action |
| Utils (logger, config, sanitizer) | 85% | Sanitizer is security-critical |

---

## Test Structure

```
tests/
├── unit/
│   ├── client/
│   │   ├── front-client.test.ts     # HTTP method wrappers, header injection
│   │   ├── oauth.test.ts            # OAuth flow steps, token refresh
│   │   ├── token-store.test.ts      # Encrypt/decrypt, file perms, corruption handling
│   │   ├── rate-limiter.test.ts     # Header parsing, delay calculation, burst tracking
│   │   └── retry.test.ts            # Backoff timing, retry-after respect, max retries
│   │
│   ├── services/
│   │   ├── conversations.service.test.ts
│   │   ├── contacts.service.test.ts
│   │   ├── messages.service.test.ts
│   │   ├── ... (one per service)
│   │   └── pagination.test.ts       # Cursor handling, auto-paginate limits
│   │
│   ├── tools/
│   │   ├── conversations.tool.test.ts
│   │   ├── contacts.tool.test.ts
│   │   ├── messages.tool.test.ts
│   │   └── ... (one per tool)
│   │
│   ├── policy/
│   │   ├── engine.test.ts           # Allow/confirm/deny decisions, overrides, tier classification
│   │   └── default-policy.test.ts   # Verify every action has a correct default tier
│   │
│   ├── schemas/
│   │   ├── conversations.schema.test.ts  # Valid/invalid input validation
│   │   ├── contacts.schema.test.ts
│   │   └── ... (one per schema)
│   │
│   └── utils/
│       ├── logger.test.ts           # Redaction, level filtering, stderr output
│       ├── config.test.ts           # File loading, env override, defaults, validation
│       └── sanitize.test.ts         # Field redaction, pattern matching, nested objects
│
├── integration/
│   ├── auth-flow.test.ts            # Full OAuth flow (mocked browser, real token exchange format)
│   ├── tool-lifecycle.test.ts       # Tool registration, schema validation, policy, response format
│   ├── rate-limit-handling.test.ts  # Simulated 429 responses, backoff behavior
│   └── error-mapping.test.ts        # Front API errors -> MCP tool errors
│
└── fixtures/
    ├── api-responses/               # Recorded Front API response bodies
    │   ├── conversations-list.json
    │   ├── conversations-get.json
    │   ├── contacts-list.json
    │   ├── messages-get.json
    │   ├── error-400.json
    │   ├── error-401.json
    │   ├── error-403.json
    │   ├── error-404.json
    │   ├── error-429.json
    │   └── ...
    ├── tokens/
    │   ├── valid-tokens.json        # Decrypted token format for testing
    │   ├── expired-access.json      # Expired access, valid refresh
    │   └── expired-refresh.json     # Both expired
    └── policies/
        ├── default.json             # Default policy
        ├── permissive.json          # All allow
        └── restrictive.json         # All confirm/deny
```

---

## Test Data Strategy

### API Response Fixtures

Recorded from the real Front API, then sanitized:
- Replace all real IDs with deterministic test IDs (e.g., `cnv_test_001`)
- Replace all PII with fake data
- Store as JSON files in `tests/fixtures/api-responses/`
- Each fixture includes both the response body and relevant headers (rate limit headers, pagination)

### Mock Server (msw)

Use `msw` (Mock Service Worker) for HTTP-level mocking:
- Intercepts `fetch`/`axios` calls to `api2.frontapp.com`
- Returns fixture data based on endpoint + method
- Allows dynamic responses (e.g., decrement rate limit headers per request)
- Integration tests use msw handlers that simulate multi-step flows

### Token Fixtures

Test tokens with known values for crypto testing:
- Fixed encryption key, IV, and plaintext for deterministic encrypt/decrypt tests
- Never use real tokens — all test tokens are synthetic

### Time

Use `vi.useFakeTimers()` for:
- Token expiration checks
- Rate limiter reset timing
- Retry backoff delays
- Refresh token 24-hour warning window

---

## Critical Test Scenarios

### Security-Critical (must not regress)

| Test | What it verifies |
|---|---|
| Token never in stdout | Capture stdout during tool call, assert no token substring |
| Token never in MCP response | Inspect every tool result for auth-like strings |
| Token file permissions | After save, stat file, assert mode 0600 |
| Encrypted at rest | Read raw token file, assert not valid JSON (encrypted) |
| HTTPS enforced | Mock HTTP (not HTTPS) request, assert client rejects |
| Sanitizer redacts configured fields | Pass object with `phone`, `token` fields, assert `[REDACTED]` |
| Sanitizer handles nested objects | Deeply nested sensitive field is still redacted |
| Policy denies destructive by default | Call delete action without policy override, assert denied |
| Policy confirm prevents execution | Call write action without `confirm: true`, assert no API call made |
| Expired token triggers refresh | Set expired access token, make API call, assert refresh called first |
| Failed refresh triggers re-auth prompt | Refresh returns 401, assert clear error message about re-authentication |

### Rate Limiting

| Test | What it verifies |
|---|---|
| Proactive delay | Set remaining=1, assert delay returned |
| 429 backoff | Mock 429 with retry-after=5, assert 5s delay before retry |
| Burst tracking | Exceed main limit, verify burst counter decremented |
| Tier-specific limits | Analytics endpoint, assert max 1 request/second |
| Max retries exhausted | 429 on all retries, assert error returned (not infinite loop) |

### Policy Engine

| Test | What it verifies |
|---|---|
| Default tier classification | Every action in every tool has correct tier |
| Override precedence | Specific override beats wildcard beats default |
| Confirmation flow | First call returns prompt, second with confirm=true executes |
| Deny returns helpful error | Denied action returns policy explanation and how to change |
| Unknown action defaults safe | Unrecognized action classified as `write` (not `read`) |

### Pagination

| Test | What it verifies |
|---|---|
| Single page | No next_page_token when no more results |
| Multi-page | next_page_token present, usable for next request |
| Auto-paginate | Follows pages until null, respects max pages limit |
| Auto-paginate safety | Stops at max_auto_paginate_pages, returns partial with warning |

---

## What NOT to Test

- Front API behavior itself (their API, their bugs)
- MCP SDK internals (transport encoding, JSON-RPC framing)
- Node.js crypto correctness (trust the built-in)
- Third-party library internals (axios/undici, zod, msw)
- TypeScript type-level checks (compiler handles these)

---

## CI Pipeline

```yaml
# Runs on every PR and push to main
test:
  - npm run lint          # ESLint strict + security rules
  - npm run type-check    # tsc --noEmit
  - npm run test          # vitest (unit + integration)
  - npm run test:coverage # vitest --coverage, fail if below targets
```

Gate: all four commands must pass. Coverage below target fails the build.
