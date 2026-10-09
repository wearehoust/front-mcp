# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-10-09

### Fixed

- `conversations.add_tag` now POSTs Front's required `TagIds` body (`{ "tag_ids": ["tag_xxx"] }`) instead of `{ "tag_id": "tag_xxx" }`, which caused `POST /conversations/{id}/tags` to return "Body did not satisfy requirements". The MCP tool still accepts singular `tag_id` from callers.
- Validate OAuth token responses and stored tokens, share concurrent refreshes, and consume each loopback callback only once.
- Write token files atomically with owner-only permissions and clean up temporary OAuth certificates.
- Match confirmations consistently, preserve existing entries at capacity, and prune expired entries.
- Parse numeric and HTTP-date `Retry-After` values and bound delays to the configured ceiling and Node timer limit.
- Report the released server version in the MCP handshake and tolerate missing CLI version metadata.

### Changed

- Update transitive dependencies and upgrade Vitest to 4.1.9.
- Use a current Node/npm runtime for trusted publishing and verify release metadata before publication.

## [1.0.0] - 2026-04-03

### Added

- 26 MCP tools covering the entire Front Platform API (200+ actions)
- OAuth 2.0 authentication with encrypted token storage (AES-256-GCM)
- API token authentication as fallback
- Configurable policy engine with allow/confirm/deny per action
- Rate limiter tracking all 5 Front rate limit headers
- Retry engine with exponential backoff and retry-after respect
- Output sanitization with configurable field/pattern redaction
- Structured JSON logging to stderr with sensitive field redaction
- CLI commands: `front-mcp auth`, `--status`, `--clear`, `--version`, `--help`
- Cursor-based pagination with auto-paginate option
- HTTPS enforcement (no HTTP fallback)
- 523 tests (unit + integration)
- CI/CD with GitHub Actions (Node 20/22, Linux/macOS)
- npm release workflow with provenance

### Security

- Token file encrypted with AES-256-GCM, PBKDF2 key derivation
- Token file permissions set to 0600 (owner read/write only)
- Destructive actions denied by default
- Write actions require explicit confirmation
- No secrets in stdout, logs, or MCP responses
- Minimal dependencies, all pinned to exact versions
