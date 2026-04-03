# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
