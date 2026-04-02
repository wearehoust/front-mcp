# Front MCP Server

A secure, fully-featured [MCP](https://modelcontextprotocol.io/) server for the [Front](https://front.com) Platform API. Provides 26 tools with 200+ actions for LLM agents to read, search, manage, and act on Front data.

## Why?

No official Front MCP server exists. Community alternatives have critical security issues: TypeScript strict mode disabled, security middleware excluded from compilation, read-only coverage. This project provides a secure, auditable, fully-featured alternative with OAuth support, a configurable operation policy engine, and proper rate limiting.

## Quick Start (API Token — 30 seconds)

1. Get a Front API token from **Settings > Developers > API tokens**.

2. Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "front": {
      "command": "npx",
      "args": ["-y", "front-mcp-server"],
      "env": {
        "FRONT_API_TOKEN": "your-front-api-token"
      }
    }
  }
}
```

3. Start Claude Code. The Front tools are now available.

## OAuth Setup (Recommended)

OAuth provides automatic token refresh and better security than API tokens.

1. Create a Front app at **Settings > Developers > OAuth apps**.
2. Set the redirect URI to `http://localhost:9876/callback`.
3. Configure:

```json
{
  "mcpServers": {
    "front": {
      "command": "npx",
      "args": ["-y", "front-mcp-server"],
      "env": {
        "FRONT_MCP_AUTH_METHOD": "oauth",
        "FRONT_MCP_OAUTH_SECRET": "your-client-secret"
      }
    }
  }
}
```

4. Run `front-mcp auth` to authenticate (opens browser).
5. Tokens are encrypted and stored locally (AES-256-GCM, 0600 permissions).

### Auth CLI

```bash
front-mcp auth            # Start OAuth flow
front-mcp auth --status   # Check auth state (no token values shown)
front-mcp auth --clear    # Remove stored tokens
```

## Architecture

```
MCP Layer (tools, policy, validation)
  |
Service Layer (resource services, pagination)
  |
Client Layer (HTTP client, OAuth, rate limiter, retry)
```

- **3-layer architecture** with strict unidirectional dependencies
- **26 compound tools** with discriminated union action parameters
- **Policy engine** with configurable allow/confirm/deny per action
- **Rate limiter** tracking all 5 Front rate limit headers
- **Retry engine** with exponential backoff and retry-after respect

## Tools Reference

| Tool | Actions |
|------|---------|
| `accounts` | list, get, create, update, delete, list_contacts, add_contact, remove_contact |
| `analytics` | create_export, get_export, create_report, get_report |
| `channels` | list, get, update, validate, create, list_for_teammate, list_for_team |
| `comments` | list, get, create, update, list_mentions, reply |
| `contact_groups` | list, create, delete, list_contacts, add_contacts, remove_contacts |
| `contact_lists` | list, create, delete, list_contacts, add_contacts, remove_contacts |
| `contact_notes` | list, create |
| `contacts` | list, get, create, update, delete, merge, list_conversations, add_handle, remove_handle |
| `conversations` | list, get, search, create, update, delete, assign, list_events, list_followers, add_followers, remove_followers, list_inboxes, add_link, remove_links, list_messages, update_reminders, add_tag, remove_tag |
| `custom_fields` | list_for_accounts, list_for_contacts, list_for_conversations, list_for_inboxes, list_for_links, list_for_teammates |
| `drafts` | list, create, create_reply, update, delete |
| `events` | list, get |
| `inboxes` | list, get, create, list_channels, list_conversations, list_access, grant_access, revoke_access |
| `knowledge_bases` | list, get, create, update, list_categories, list_articles, get_article, create_article, update_article, delete_article, get_category, create_category, update_category, delete_category |
| `links` | list, get, create, update, list_conversations |
| `message_template_folders` | list, get, create, update, delete, list_children, create_child |
| `message_templates` | list, get, create, update, delete, list_children, create_child |
| `messages` | get, create, reply, import, receive_custom, get_seen_status, mark_seen |
| `rules` | list, list_for_inbox, get, list_for_teammate, list_for_team |
| `shifts` | list, get, create, update, list_teammates, add_teammates, remove_teammates |
| `signatures` | list, get, update, delete, create_for_teammate, create_for_team |
| `tags` | list, get, create, update, delete, list_children, create_child, list_conversations |
| `teammate_groups` | list, get, create, update, delete, list_inboxes, add_inboxes, remove_inboxes, list_teammates, add_teammates, remove_teammates, list_teams, add_teams, remove_teams |
| `teammates` | list, get, update, list_conversations, list_inboxes |
| `teams` | list, get, add_teammates, remove_teammates |
| `token_identity` | get |

## Policy Engine

Every action is classified into a tier with a default decision:

| Tier | Default | Examples |
|------|---------|----------|
| `read` | allow | list, get, search |
| `write` | confirm | create, update, assign |
| `destructive` | deny | delete, remove |

### Confirmation Flow

Write actions require confirmation by default:
1. LLM calls `conversations` with `action: "assign"`.
2. Tool returns: "CONFIRMATION REQUIRED: ... Call again with confirm: true."
3. LLM calls again with `confirm: true` to execute.

### Custom Policy

Create `~/.front-mcp/policy.json`:

```json
{
  "defaults": {
    "read": "allow",
    "write": "allow",
    "destructive": "confirm"
  },
  "overrides": [
    { "tool": "conversations", "action": "delete", "decision": "deny" },
    { "tool": "tags", "action": "*", "decision": "allow" }
  ]
}
```

Override precedence: specific action > tool wildcard > tier default.

## Security Model

- **HTTPS enforced** — no HTTP fallback, ever
- **Token encryption** — AES-256-GCM with PBKDF2 key derivation
- **File permissions** — token file is 0600 (owner read/write only)
- **Output sanitization** — configurable field redaction before LLM sees data
- **Log redaction** — sensitive fields redacted from all log output
- **Policy engine** — destructive actions denied by default
- **No secrets in stdout** — stdout is reserved for MCP protocol only
- **Minimal dependencies** — native fetch, Node.js crypto, no unnecessary packages
- **Pinned versions** — all dependencies at exact versions

## Configuration

Config file: `~/.front-mcp/config.json` (or `$XDG_CONFIG_HOME/front-mcp/config.json`)

See `config/config.example.json` for all options.

Environment variable overrides:
- `FRONT_API_TOKEN` — API token for authentication
- `FRONT_MCP_AUTH_METHOD` — `oauth` or `api_token`
- `FRONT_MCP_LOG_LEVEL` — `error`, `warn`, `info`, `debug`
- `FRONT_MCP_POLICY_FILE` — path to custom policy file

## License

MIT
