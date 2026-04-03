# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in front-mcp-server, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email security concerns to the maintainers directly or use GitHub's private vulnerability reporting feature:

1. Go to the [Security tab](https://github.com/wearehoust/front-mcp-server/security/advisories)
2. Click "Report a vulnerability"
3. Provide a description of the vulnerability and steps to reproduce

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix release:** Within 2 weeks for critical issues

## Scope

The following are in scope:
- Token leakage (OAuth tokens, API tokens appearing in logs, stdout, or MCP responses)
- Encryption weaknesses in token storage
- Policy engine bypasses (executing denied actions)
- Command injection via tool parameters
- HTTPS enforcement bypasses
- File permission issues on token storage

The following are out of scope:
- Front API vulnerabilities (report to Front directly)
- MCP SDK vulnerabilities (report to Anthropic)
- Issues requiring physical access to the machine

## Security Design

This project was built with security as a foundational concern:

- **Token encryption:** AES-256-GCM with PBKDF2 key derivation
- **File permissions:** Token file restricted to 0600 (owner only)
- **HTTPS enforced:** No HTTP fallback for API or OAuth
- **Output sanitization:** Configurable field redaction before data reaches the LLM
- **Policy engine:** Destructive actions denied by default
- **No secrets in stdout:** stdout is reserved exclusively for MCP protocol
- **Minimal dependencies:** Native fetch, Node.js crypto, pinned exact versions
- **Log redaction:** Sensitive fields automatically redacted from all log output
