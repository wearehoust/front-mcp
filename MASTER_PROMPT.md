# Front MCP Server — Autonomous Production Build

You are building a secure, fully-featured MCP server for the Front Platform API.

## What Already Exists

```
~/front-mcp-server/
├── specs/
│   ├── requirements.md      # 10 functional requirements, 4 non-functional, binary acceptance criteria
│   ├── technical-spec.md    # 3-layer architecture, 6 design decisions, threat model, file-level specs
│   ├── testing-spec.md      # vitest + msw, coverage targets per layer, 20+ critical test scenarios
│   └── plan.md              # 8 milestones, dependency graph, parallelization strategy
└── docs/
    └── IDEAS FOR FUTURE.md  # Deferred scope (Streamable HTTP, Rust rewrite)
```

These specs are the source of truth. Every line of code you write must trace back to a spec requirement. If a spec is ambiguous, interpret it conservatively (safer, stricter). If a spec is wrong, fix the spec first, then implement.

## Your Mission

Build this project from empty `src/` to production-ready, PR-merged code that 1000 users can `npx front-mcp-server` and trust with their Front data. Do not return control to me until the PR is created and every gate is green.

---

## Rules of Engagement

### Rule 1: Specs Are Law
Read ALL four spec files before writing a single line of code. Re-read the relevant spec sections before each milestone. Do not deviate from the architecture in technical-spec.md. Do not skip acceptance criteria in requirements.md. Do not lower coverage targets from testing-spec.md. If you think a spec decision is wrong, update the spec file with your reasoning, then implement the updated spec.

### Rule 2: Tests Before Code, Always
Every feature starts as a failing test. Write the test. Watch it fail. Then write the implementation. Watch it pass. This is not optional. This is not skippable for "simple" code. testing-spec.md Section "Critical Test Scenarios" lists 20+ tests that must never regress — implement every single one.

### Rule 3: Gates Are Non-Negotiable
After every milestone, run:
```
npm run lint          # zero errors, zero warnings
npm run type-check    # tsc --noEmit, zero errors
npm run test          # all tests pass
npm run test:coverage # meets testing-spec.md targets for this layer
```
If ANY gate fails: stop, fix, re-run. Do not proceed. Do not comment out tests. Do not add ts-ignore. Do not lower thresholds. Do not "come back to it later." Fix it now or explain why it cannot be fixed.

### Rule 4: No Handbacks
Do not ask me:
- Which approach to take (specs decided this)
- To review intermediate work (gate-check and spec-review are your reviewers)
- To make judgment calls (use your best judgment)
- To resolve test failures (debug and fix them)

Only return control if:
- A decision has permanent external consequences (npm package name, GitHub repo name)
- A Front API behavior contradicts the spec and you need domain input
- You have exhausted all debugging approaches on a blocker

### Rule 5: Zero Debt
No TODO comments. No FIXME. No HACK. No `as any`. No `ts-ignore`. No `eslint-disable`. No skipped tests. No "placeholder" implementations. Every file you commit is production-final for that milestone.

### Rule 6: Security Is Not A Feature, It Is The Foundation
This project exists because community alternatives have security flaws. Every decision defaults to the secure option. Re-read the threat model in technical-spec.md before implementing auth, token storage, sanitization, and the policy engine. The security-critical tests in testing-spec.md are your regression shield — implement all of them.

---

## Execution Plan

### Phase 0: Project Setup
```
/dev-process-toolkit:setup existing
```
Then initialize git:
```
git init
git add specs/ docs/
git commit -m "feat: add project specifications and design docs"
```

### Phase 1: Foundation — Sequential, No Shortcuts

**Milestone 1: Project Scaffold + Client Layer**
```
/dev-process-toolkit:implement M1
```
This builds: tsconfig (strict), eslint, config loader, logger, sanitizer, FrontClient (native fetch), rate limiter, retry engine, API token auth.

Verify after M1:
- [ ] `npm run lint && npm run type-check && npm run test` all pass
- [ ] Config loads from file, env vars override, Zod validates
- [ ] Logger writes to stderr only, redacts sensitive fields
- [ ] Sanitizer handles nested objects, redacts DEFAULT_REDACTED_FIELDS from tech spec D-6
- [ ] Rate limiter parses all 5 Front rate limit headers
- [ ] Retry engine respects retry-after, backs off exponentially, stops after max retries
- [ ] FrontClient injects Bearer token, enforces HTTPS, no HTTP fallback
- [ ] Coverage meets: client 90%, utils 85%

Commit: `feat(M1): project scaffold, client layer with auth, rate limiting, retry`

**Milestone 2: Policy Engine**
```
/dev-process-toolkit:implement M2
```
This builds: action tier classification, default policy, configurable overrides, confirmation flow.

Verify after M2:
- [ ] Every action across all 26 tools has a default tier (read/write/destructive)
- [ ] Default decisions: read=allow, write=confirm, destructive=deny
- [ ] Per-action overrides work (specific > wildcard > default)
- [ ] Confirmation flow: first call returns prompt, second with confirm=true executes
- [ ] Denied actions return clear error with policy change instructions
- [ ] Unknown actions default to "write" tier (safe default)
- [ ] Coverage: policy engine 95%

Commit: `feat(M2): policy engine with configurable allow/confirm/deny tiers`

### Phase 2: Core Resources — Parallel Agent Teams

**Milestone 3: Core Services (5 resources)**

Dispatch 5 agents in parallel using worktree isolation:

| Agent | Resource | Delivers |
|-------|----------|----------|
| A | conversations | schema + service + unit tests |
| B | messages | schema + service + unit tests |
| C | contacts | schema + service + unit tests |
| D | tags | schema + service + unit tests |
| E | inboxes | schema + service + unit tests |

Before dispatching: implement `pagination.ts` and `common.schema.ts` first (shared dependencies). Then dispatch all 5 agents simultaneously.

Each agent's brief:
```
Read specs/technical-spec.md sections: D-1 (compound tools), file-level specs for services and schemas.
Read specs/testing-spec.md for test structure and fixtures.
Read specs/requirements.md FR-3 table for your resource's complete action list.

Implement:
1. src/schemas/<resource>.schema.ts — Zod discriminated union, one variant per action
2. src/services/<resource>.service.ts — one method per action, uses FrontClient, handles pagination
3. tests/unit/schemas/<resource>.schema.test.ts — valid + invalid input validation
4. tests/unit/services/<resource>.service.test.ts — every action with msw fixtures
5. tests/fixtures/api-responses/<resource>-*.json — sanitized response fixtures

Follow the exact patterns from pagination.ts and common.schema.ts.
TypeScript strict. No any. No ts-ignore. All tests must pass.
```

After all 5 agents merge:
```
/dev-process-toolkit:gate-check
```
Fix any integration conflicts. Commit: `feat(M3): core service layer — conversations, messages, contacts, tags, inboxes`

**Milestone 4: Core Tools (5 resources + server bootstrap)**

Dispatch 6 agents in parallel:

| Agent | Resource | Delivers |
|-------|----------|----------|
| A | conversations.tool | tool registration + integration tests |
| B | messages.tool | tool registration + integration tests |
| C | contacts.tool | tool registration + integration tests |
| D | tags.tool | tool registration + integration tests |
| E | inboxes.tool | tool registration + integration tests |
| F | server.ts + index.ts | MCP server setup, stdio transport, tool orchestrator, entry point |

Agent F must complete server.ts first (or provide the interface contract) so tool agents know the registration signature.

Each tool agent's brief:
```
Read specs/technical-spec.md: tool registration pattern in "src/tools/*.tool.ts" section.
Read specs/requirements.md FR-4 for policy integration.

Implement:
1. src/tools/<resource>.tool.ts — register function with: Zod validation → policy check → service call → sanitize → format response
2. tests/unit/tools/<resource>.tool.test.ts — policy allow/confirm/deny paths, error mapping, sanitization
3. tests/integration/tool-lifecycle.test.ts (Agent F only) — full registration, schema validation, response format

Every tool must:
- Set MCP annotations (readOnlyHint, destructiveHint) based on action tier
- Return structured content + text summary
- Handle confirmation flow (confirm param)
- Sanitize output before returning
```

After all 6 agents merge:
```
/dev-process-toolkit:gate-check
/dev-process-toolkit:spec-review
```
Verify: FR-3 (core 5 resources), FR-4 (policy), FR-5 (rate limiting), FR-6 (pagination), FR-7 (errors) — all show ✓ for the core 5.

Commit: `feat(M4): MCP tool layer, server bootstrap, stdio transport — core 5 resources operational`

### Phase 3: Full Coverage — Maximum Parallelism

**Milestone 5: Remaining Services (20 resources)**

Dispatch 4 batch agents in parallel:

| Agent | Resources (5 each) |
|-------|-------------------|
| Batch A | accounts, analytics, channels, comments, contact-groups |
| Batch B | contact-lists, contact-notes, custom-fields, drafts, events |
| Batch C | knowledge-bases, links, message-template-folders, message-templates, rules |
| Batch D | shifts, signatures, teammate-groups, teammates, teams |

Each batch agent's brief:
```
You are implementing 5 Front API resource services. For EACH resource:

1. Read specs/requirements.md FR-3 table — get the exact action list for this resource
2. Copy the patterns from src/schemas/conversations.schema.ts and src/services/conversations.service.ts exactly
3. Implement: schema + service + unit tests + fixtures
4. Run tests for your files before returning

Resources: [list the 5]
Deliver: 5 schema files, 5 service files, 10 test files, fixture JSON files
```

After all 4 agents merge:
```
/dev-process-toolkit:gate-check
```
Commit: `feat(M5): complete service layer — all 25 Front API resources`

**Milestone 6: Remaining Tools (20 resources)**

Dispatch 4 batch agents in parallel (same batches):

Each batch agent's brief:
```
You are implementing 5 MCP tool registrations. For EACH resource:

1. Read specs/requirements.md FR-3 table for action list
2. Copy the pattern from src/tools/conversations.tool.ts exactly
3. Implement: tool registration + tests
4. Every action must have correct policy tier annotation

Resources: [list the 5]
```

After all 4 agents merge:
```
/dev-process-toolkit:gate-check
/dev-process-toolkit:spec-review all
```
Verify: FR-3 complete table — every single action across all 26 tools shows ✓.

Commit: `feat(M6): complete MCP tool layer — all 26 tools, 200+ actions`

### Phase 4: OAuth — Sequential, Security-Critical

**Milestone 7: OAuth Flow**
```
/dev-process-toolkit:implement M7
```
Do NOT parallelize this. It touches encryption, key derivation, token storage, and auth flow — these must be reviewed as a cohesive unit.

Verify after M7:
- [ ] `front-mcp auth` opens browser, completes OAuth, stores encrypted tokens
- [ ] Token file is AES-256-GCM encrypted, file permissions 0600
- [ ] Expired access token triggers silent refresh
- [ ] Failed refresh returns clear re-auth message (not crash)
- [ ] Refresh token 24-hour expiry warning works
- [ ] `front-mcp auth --status` shows state without revealing token values
- [ ] `front-mcp auth --clear` securely removes token file
- [ ] FrontClient auto-detects OAuth vs API token
- [ ] Coverage: client layer still 90%+

Commit: `feat(M7): OAuth 2.0 flow with encrypted token storage`

### Phase 5: Production Polish — Sequential

**Milestone 8: README + npm Config**
```
/dev-process-toolkit:implement M8
```

Verify after M8:
- [ ] README: project description, quick start (<5 min), OAuth guide, Claude Code config snippet, full tool reference, policy guide, security model
- [ ] package.json: name, version, description, keywords, bin, prepublishOnly script
- [ ] .npmignore excludes tests, fixtures, specs, docs
- [ ] LICENSE (MIT)
- [ ] config/config.example.json with all options documented
- [ ] config/default-policy.json with all 200+ actions and their tiers
- [ ] `npm pack` produces clean package with no extraneous files

Commit: `feat(M8): README, npm configuration, example configs`

### Phase 6: Final Verification — The Gauntlet

Run these in order. ALL must pass. If any fails, fix and re-run the entire gauntlet.

```
# 1. Full spec compliance
/dev-process-toolkit:spec-review all
# Expected: every FR-1 through FR-10 shows ✓, every NFR-1 through NFR-4 shows ✓
# If ANY shows ✗ or ⚠ — STOP. Fix it. Re-run from step 1.

# 2. Full gate check
/dev-process-toolkit:gate-check
# Expected: lint ✓, typecheck ✓, tests ✓, coverage ✓

# 3. Code quality sweep
/dev-process-toolkit:simplify
# Then re-run gate-check to confirm simplify didn't break anything
/dev-process-toolkit:gate-check

# 4. Security audit (run these manually)
# Grep for leaked secrets:
grep -rn "Bearer " src/ --include="*.ts" | grep -v "test" | grep -v ".service." | grep -v "front-client"
# Verify no console.log (stdout must be MCP-only):
grep -rn "console.log" src/ --include="*.ts"
# Verify no ts-ignore or type escapes:
grep -rn "ts-ignore\|ts-expect-error\|as any\|eslint-disable" src/ --include="*.ts"
# Verify no TODO/FIXME/HACK:
grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts"
# If ANY of these return results: fix them. Re-run from step 1.

# 5. Package audit
npm audit
# If critical or high vulnerabilities: fix or replace the dependency.

# 6. Dry run
npm pack --dry-run
# Verify: no test files, no fixture files, no spec files, no .env files in the package

# 7. Spec review one final time (after all fixes)
/dev-process-toolkit:spec-review all
# Must be 100% ✓ across all requirements.
```

### Phase 7: Ship It

```
/dev-process-toolkit:pr
```

PR title: `feat: Front MCP Server — secure, fully-featured, 26 tools, 200+ actions`

PR body must include:
- Summary of what this is and why it exists
- Architecture overview (3-layer diagram from tech spec)
- Security highlights (OAuth, encrypted tokens, policy engine, sanitization)
- Test coverage summary (actual numbers from the coverage report)
- Setup instructions (copy from README quick start)
- Link to full tool reference in README

---

## Agent Coordination Rules

1. **Shared code first.** Before dispatching parallel agents, ensure all shared dependencies are committed and stable (pagination.ts, common.schema.ts, server.ts interfaces).

2. **Identical patterns.** Every agent gets the same reference implementation to copy. M3/M4 core 5 establish the pattern. M5/M6 remaining 20 replicate it mechanically.

3. **Worktree isolation.** Use git worktrees for parallel agents when possible. Merge conflicts are your problem to resolve — not mine.

4. **Post-merge gate.** After merging ANY parallel work, run the full gate check. Parallel agents may produce code that passes individually but conflicts when combined.

5. **No architectural freelancing.** Agents implement exactly the pattern from the reference files. No "improvements," no "I found a better way," no deviations. Consistency across 26 tools is more important than local optimization.

---

## Definition of Done

This project is done when ALL of the following are true:

- [ ] 26 MCP tools registered, each with a discriminated union action parameter
- [ ] 200+ actions covering the complete Front API surface per FR-3 table
- [ ] OAuth flow works end-to-end with encrypted token storage
- [ ] API token fallback works with warning
- [ ] Policy engine enforces allow/confirm/deny per action with configurable overrides
- [ ] Rate limiter tracks all 5 Front headers + tier-specific limits
- [ ] Retry engine with exponential backoff and retry-after respect
- [ ] Output sanitization with configurable field redaction
- [ ] Structured logging to stderr with sensitive field redaction
- [ ] All 20+ security-critical tests from testing-spec.md pass
- [ ] Coverage meets targets: policy 95%, client 90%, services 85%, utils 85%, tools 80%
- [ ] npm run lint: zero errors
- [ ] npm run type-check: zero errors
- [ ] npm run test: all pass
- [ ] Zero: ts-ignore, as any, eslint-disable, TODO, FIXME, HACK, console.log
- [ ] npm audit: no critical or high vulnerabilities
- [ ] npm pack: clean package, no test/fixture/spec files
- [ ] README: complete with quick start, OAuth guide, tool reference, security model
- [ ] /dev-process-toolkit:spec-review all: 100% ✓
- [ ] PR created with conventional format

Start now. Read the specs. Begin Phase 0.
