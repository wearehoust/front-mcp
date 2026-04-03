# Front MCP

[![CI](https://github.com/wearehoust/front-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/wearehoust/front-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@houst-com/front-mcp)](https://www.npmjs.com/package/@houst-com/front-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/@houst-com/front-mcp)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](tsconfig.json)
[![MCP](https://img.shields.io/badge/MCP-26_tools-green)](docs/TOOL_REFERENCE.md)
[![Front API](https://img.shields.io/badge/Front_API-172_actions-orange)](https://dev.frontapp.com/reference)

Use Front from any MCP-compatible client. Search conversations, manage contacts, send messages, tag, assign, and automate inbox workflows — 26 tools, 172 actions.

## Quick Start

1. Get a Front API token from **Settings > Developers > API tokens**.

2. Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "front": {
      "command": "npx",
      "args": ["-y", "@houst-com/front-mcp"],
      "env": {
        "FRONT_API_TOKEN": "your-front-api-token"
      }
    }
  }
}
```

3. Start Claude Code. The Front tools are now available.

## Example Workflows

**Search for a conversation:**
> "Search Front conversations about billing issues"

**Inspect a thread:**
> "Get the messages in conversation cnv_abc123"

**Manage contacts:**
> "List contacts and find the one with email alice@example.com"

**Tag and assign:**
> "Tag conversation cnv_abc123 with 'urgent' and assign it to teammate tea_xyz"

**Draft a reply:**
> "Create a draft reply to conversation cnv_abc123 saying we'll follow up tomorrow"

## OAuth Setup (Recommended)

OAuth provides automatic token refresh and better security than API tokens.

1. Create a Front app at **Settings > Developers > OAuth apps**.
2. Set the redirect URI to `https://localhost:9876/callback`.
3. Enable the resource permissions your MCP server needs (Read, Write, Delete, Send).
4. Save the app — copy the **Client ID** from the OAuth feature (not the App secret from Settings).
5. Create `~/.front-mcp/config.json`:

```json
{
  "auth": {
    "method": "oauth",
    "oauth": {
      "client_id": "your-client-id",
      "client_secret_env": "FRONT_MCP_OAUTH_SECRET",
      "redirect_port": 9876,
      "scopes": []
    }
  }
}
```

6. Configure Claude Code:

```json
{
  "mcpServers": {
    "front": {
      "command": "npx",
      "args": ["-y", "@houst-com/front-mcp"],
      "env": {
        "FRONT_MCP_AUTH_METHOD": "oauth",
        "FRONT_MCP_OAUTH_SECRET": "your-oauth-client-secret"
      }
    }
  }
}
```

7. Run `npx @houst-com/front-mcp auth` to authenticate (opens browser).
8. Tokens are encrypted and stored locally (AES-256-GCM, 0600 permissions).

### Auth CLI

```bash
front-mcp auth            # Start OAuth flow
front-mcp auth --status   # Check auth state (no token values shown)
front-mcp auth --clear    # Remove stored tokens
front-mcp --version       # Show version
front-mcp --help          # Show usage
```

## Front Permissions

The MCP server needs Front API permissions matching the actions you want to use:

| Permission | Required for |
|------------|-------------|
| Read | All list/get/search actions |
| Write | create, update, assign, add, merge, reply |
| Delete | delete, remove actions |
| Send | messages.create, messages.reply |

For OAuth, configure these in your Front app under **Features > OAuth > Resource permissions**.
For API tokens, permissions are set when creating the token.

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
| `message_templates` | list, get, create, update, delete |
| `messages` | get, create, reply, import, receive_custom, get_seen_status, mark_seen |
| `rules` | list, get, list_for_teammate, list_for_team |
| `shifts` | list, get, create, update, list_teammates, add_teammates, remove_teammates |
| `signatures` | list, get, update, delete, create_for_teammate, create_for_team |
| `tags` | list, get, create, update, delete, list_children, create_child, list_conversations |
| `teammate_groups` | list, get, create, update, delete, list_inboxes, add_inboxes, remove_inboxes, list_teammates, add_teammates, remove_teammates, list_teams, add_teams, remove_teams |
| `teammates` | list, get, update, list_conversations, list_inboxes |
| `teams` | list, get, add_teammates, remove_teammates |
| `token_identity` | get |

See [docs/TOOL_REFERENCE.md](docs/TOOL_REFERENCE.md) for the complete reference with policy tiers per action.

## Policy Engine

Every action is classified into a tier with a default decision:

| Tier | Default | Examples |
|------|---------|----------|
| `read` | allow | list, get, search |
| `write` | confirm | create, update, assign |
| `destructive` | deny | delete, remove |

Write actions require a two-step confirmation: the first call returns a prompt, the second call with `confirm: true` executes. Destructive actions are denied by default.

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
- **Policy engine** — destructive actions denied by default, write actions require confirmation
- **No secrets in stdout** — stdout is reserved for MCP protocol only
- **Minimal dependencies** — native fetch, Node.js crypto, pinned exact versions

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FRONT_API_TOKEN` | Yes (unless OAuth) | Front API token |
| `FRONT_MCP_AUTH_METHOD` | No | `oauth` or `api_token` (default: `api_token`) |
| `FRONT_MCP_OAUTH_SECRET` | Yes (if OAuth) | OAuth client secret |
| `FRONT_MCP_LOG_LEVEL` | No | `error`, `warn`, `info`, `debug` (default: `info`) |
| `FRONT_MCP_POLICY_FILE` | No | Path to custom policy JSON file |

## Limitations

- **stdio transport only** — no HTTP/SSE transport in v1 (planned for future)
- **Single Front account** — one account per server instance
- **No webhook support** — outbound API calls only, no inbound event processing
- **No caching** — every request hits the Front API (relies on Front's freshness)
- **Attachments** — file upload/download not supported in v1
- **Application channels** — channel-specific message sync endpoints not supported

## Development

```bash
git clone https://github.com/wearehoust/front-mcp.git
cd front-mcp
npm install
npm test          # 519 tests
npm run lint      # ESLint strict
npm run type-check # TypeScript strict
npm run build     # Compile to dist/
```

## Testing

```bash
npm test              # Unit + integration tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run smoke         # Smoke test (builds, starts, verifies 26 tools)
```

The project includes 519 unit/integration tests and a 172-action live API test script (`scripts/live-test-full.js`).

## Release Process

1. Update version in `package.json` and `server.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push origin main --tags`
6. GitHub Actions publishes to npm (requires `NPM_TOKEN` secret)
7. Publish to MCP Registry: `mcp-publisher publish`

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code standards, and PR process.

## License

MIT
