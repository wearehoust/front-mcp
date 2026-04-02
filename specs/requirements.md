# Requirements: Front MCP Server

## Overview

**Project:** A secure, fully-featured MCP (Model Context Protocol) server that exposes the entire Front Platform API to LLM agents via stdio transport.

**Who is it for:** Developers and teams who use Front for customer communication and want LLM agents (Claude Code, etc.) to read, search, manage, and act on Front data securely — without relying on untrusted community MCP servers.

**Problem it solves:** No official Front MCP server exists. The two community-built options have critical security issues: one has 152 tools with TypeScript strict mode off and dead security code that never compiles; the other is read-only and dormant. This project provides a secure, auditable, fully-featured alternative with OAuth support, configurable operation policies, and proper rate limiting.

---

## Functional Requirements

### FR-1: OAuth Authentication (Primary)

The server MUST support Front's OAuth 2.0 authorization code flow as the primary authentication method.

- **AC-1.1:** Server launches a local HTTP callback server and opens the user's browser to Front's authorization URL on first run.
- **AC-1.2:** Server exchanges the authorization code for access and refresh tokens.
- **AC-1.3:** Access tokens (60-min expiry) are refreshed automatically and silently using the refresh token (6-month expiry).
- **AC-1.4:** Tokens are stored locally in an encrypted file (AES-256-GCM) with a machine-derived key.
- **AC-1.5:** Server warns and re-initiates OAuth flow when refresh token is within 24 hours of expiry.
- **AC-1.6:** A `front-mcp auth` CLI command allows users to manually trigger the OAuth flow.

### FR-2: API Token Authentication (Fallback)

The server MUST support Front API tokens as a fallback authentication method.

- **AC-2.1:** API token is accepted via `FRONT_API_TOKEN` environment variable.
- **AC-2.2:** Server logs a warning to stderr on startup when using API token instead of OAuth.
- **AC-2.3:** API token is never logged, written to disk, or included in error output.

### FR-3: Full Front API Coverage

The server MUST expose the entire Front Platform API (~200+ endpoints) as MCP tools.

- **AC-3.1:** Every Front API resource type has a corresponding compound MCP tool with an `action` parameter.
- **AC-3.2:** The following resource tools are implemented:

| Tool Name | Resource | Actions |
|---|---|---|
| `accounts` | Accounts | list, get, create, update, delete, list_contacts, add_contact, remove_contact |
| `analytics` | Analytics | create_export, get_export, create_report, get_report |
| `channels` | Channels | list, get, update, validate, create, list_for_teammate, list_for_team |
| `comments` | Comments | list, get, create, update, list_mentions, reply |
| `contact_groups` | Contact Groups | list, create, delete, list_contacts, add_contacts, remove_contacts |
| `contact_lists` | Contact Lists | list, create, delete, list_contacts, add_contacts, remove_contacts |
| `contact_notes` | Contact Notes | list, create |
| `contacts` | Contacts | list, get, create, update, delete, merge, list_conversations, add_handle, remove_handle |
| `conversations` | Conversations | list, get, search, create, update, delete, assign, list_events, list_followers, add_followers, remove_followers, list_inboxes, add_link, remove_links, list_messages, update_reminders, add_tag, remove_tag |
| `custom_fields` | Custom Fields | list_for_accounts, list_for_contacts, list_for_conversations, list_for_inboxes, list_for_links, list_for_teammates |
| `drafts` | Drafts | list, create, create_reply, update, delete |
| `events` | Events | list, get |
| `inboxes` | Inboxes | list, get, create, list_channels, list_conversations, list_access, grant_access, revoke_access |
| `knowledge_bases` | Knowledge Bases | list, get, create, update, list_categories, list_articles, get_article, create_article, update_article, delete_article, get_category, create_category, update_category, delete_category |
| `links` | Links | list, get, create, update, list_conversations |
| `message_template_folders` | Message Template Folders | list, get, create, update, delete, list_children, create_child |
| `message_templates` | Message Templates | list, get, create, update, delete, list_children, create_child |
| `messages` | Messages | get, create, reply, import, receive_custom, get_seen_status, mark_seen |
| `rules` | Rules | list, list_for_inbox, get, list_for_teammate, list_for_team |
| `shifts` | Shifts | list, get, create, update, list_teammates, add_teammates, remove_teammates |
| `signatures` | Signatures | list, get, update, delete, create_for_teammate, create_for_team |
| `tags` | Tags | list, get, create, update, delete, list_children, create_child, list_conversations |
| `teammate_groups` | Teammate Groups | list, get, create, update, delete, list_inboxes, add_inboxes, remove_inboxes, list_teammates, add_teammates, remove_teammates, list_teams, add_teams, remove_teams |
| `teammates` | Teammates | list, get, update, list_conversations, list_inboxes |
| `teams` | Teams | list, get, add_teammates, remove_teammates |
| `token_identity` | Token Identity | get |

- **AC-3.3:** Each tool has a descriptive MCP tool description that helps the LLM understand when and how to use it.
- **AC-3.4:** Each action within a tool has its parameters validated via Zod schemas at the MCP layer before any API call.
- **AC-3.5:** Tool responses include structured content with the API response data, plus a text summary for the LLM.

### FR-4: Operation Policy Engine

The server MUST enforce a configurable policy for operation safety.

- **AC-4.1:** Every action is classified into a tier: `read`, `write`, or `destructive`.
- **AC-4.2:** Default policy: `read` = allow, `write` = confirm, `destructive` = deny.
- **AC-4.3:** Policy is loaded from a JSON config file at `~/.front-mcp/policy.json` with fallback to built-in defaults.
- **AC-4.4:** Per-action overrides are supported (e.g., `conversations.add_tag` = allow, `messages.create` = confirm).
- **AC-4.5:** When an action requires confirmation, the tool returns a confirmation prompt with a preview of what will happen. The LLM must call the tool again with a `confirm: true` parameter to execute.
- **AC-4.6:** When an action is denied, the tool returns an error explaining the policy and how to change it.
- **AC-4.7:** MCP tool annotations (`readOnlyHint`, `destructiveHint`) are set correctly based on action tier.

### FR-5: Rate Limiting

The server MUST respect Front's rate limits.

- **AC-5.1:** Rate limit headers (`x-ratelimit-remaining`, `x-ratelimit-reset`) are tracked from every API response.
- **AC-5.2:** When approaching the limit (< 10% remaining), the server proactively delays requests.
- **AC-5.3:** On HTTP 429, the server respects the `retry-after` header with exponential backoff.
- **AC-5.4:** Burst limit tracking is implemented (50% of plan limit, 10-min window).
- **AC-5.5:** Tier-specific rate limits are respected (analytics = 1/sec, conversations/messages = 5/sec, search = 40% of global).

### FR-6: Pagination

The server MUST handle Front's cursor-based pagination.

- **AC-6.1:** List actions accept an optional `page_token` and `limit` parameter.
- **AC-6.2:** Responses include a `next_page_token` field when more results exist.
- **AC-6.3:** An `auto_paginate` option (default: false) fetches all pages and returns combined results, with a configurable max page limit to prevent runaway requests.

### FR-7: Error Handling

The server MUST provide clear, actionable error information.

- **AC-7.1:** Front API errors are mapped to structured MCP tool errors with `isError: true`.
- **AC-7.2:** Error responses include the HTTP status code, Front's error message, and a suggested action.
- **AC-7.3:** Sensitive data (tokens, full request bodies with customer data) is never included in error output.
- **AC-7.4:** Network errors, timeouts, and rate limit errors are distinguished from API errors.

### FR-8: Logging

The server MUST provide structured logging for debugging and auditing.

- **AC-8.1:** All logs go to stderr (never stdout, which is reserved for MCP protocol).
- **AC-8.2:** Log levels: error, warn, info, debug. Configurable via `LOG_LEVEL` env var.
- **AC-8.3:** Every API call is logged at info level with: method, endpoint, response status, duration.
- **AC-8.4:** Sensitive fields (Authorization header, token values, customer PII) are redacted from all log output.
- **AC-8.5:** Debug level includes request/response bodies with sensitive field redaction.

### FR-9: Configuration

The server MUST be configurable via a single config file with env var overrides.

- **AC-9.1:** Config file location: `~/.front-mcp/config.json` (XDG-compliant fallback: `$XDG_CONFIG_HOME/front-mcp/config.json`).
- **AC-9.2:** All config values have sensible defaults and work out-of-the-box with just an auth token.
- **AC-9.3:** Server config environment variables are prefixed with `FRONT_MCP_` (e.g., `FRONT_MCP_LOG_LEVEL`). Exception: `FRONT_API_TOKEN` uses its well-known name for compatibility (FR-2).
- **AC-9.4:** Config includes: auth method, log level, policy file path, rate limit behavior, pagination defaults.

### FR-10: Output Sanitization

The server MUST protect sensitive data in all outputs.

- **AC-10.1:** A configurable list of field names to redact from API responses before returning to the LLM (defaults listed in technical spec D-6). Users add fields relevant to their data via config.
- **AC-10.2:** Redaction is applied consistently across all tool responses.
- **AC-10.3:** Users can disable redaction via config for trusted environments.

---

## Non-Functional Requirements

### NFR-1: Security

- All HTTP traffic to Front uses HTTPS exclusively (enforced, not configurable).
- No secrets are ever written to stdout, logged, or included in MCP responses.
- Token storage file has 0600 permissions (owner read/write only).
- Dependencies are minimal and pinned to exact versions.
- TypeScript strict mode is ON with all checks enabled.

### NFR-2: Performance

- Server startup time < 2 seconds.
- Individual tool calls complete within Front's API response time + < 100ms overhead.
- Rate limiter tracking adds negligible overhead (in-memory state).

### NFR-3: Reliability

- Server handles Front API downtime gracefully with clear error messages.
- Token refresh failures trigger a clear re-auth prompt, not a crash.
- Malformed API responses are caught and reported, not propagated as crashes.

### NFR-4: Developer Experience

- `npm install` + set one env var = working server.
- README includes setup guide, Claude Code config snippet, and usage examples.
- Every tool has clear descriptions that help the LLM choose the right tool and action.

---

## Out of Scope

- **Streamable HTTP transport** — stdio only for v1 (noted in IDEAS FOR FUTURE.md).
- **Rust rewrite** — TypeScript for v1 (noted in IDEAS FOR FUTURE.md).
- **Webhook ingestion** — no inbound webhook server; the server only calls the Front API outbound.
- **Multi-account support** — one Front account per server instance.
- **Front Plugin SDK / Channel API** — Core API only.
- **GUI or web dashboard** — CLI and config files only.
- **Caching** — no response caching in v1; rely on Front's API freshness.
