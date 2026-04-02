# Ideas for Future

## Transport: Streamable HTTP

Add Streamable HTTP transport as an alternative to stdio. This would allow the MCP server to run as a standalone service supporting multiple clients and remote access.

**Benefits:**
- Multiple concurrent client connections
- Remote access (deploy as a hosted service)
- SSE streaming for server-initiated notifications (e.g., webhook events from Front)
- Session management with resumability

**Security requirements when implemented:**
- Validate `Origin` header on all connections (prevent DNS rebinding)
- Bind to localhost only when running locally
- Implement proper authentication for all connections
- Use cryptographically secure session IDs

## Rust Rewrite

Rewrite the MCP server in Rust once the Rust MCP SDK matures. Benefits:
- Memory safety without garbage collection
- Smaller binary, faster startup
- Better suited for distribution as a standalone binary (no Node.js dependency)
- Stronger compile-time guarantees

**Blockers:**
- Rust MCP SDK is less mature than TypeScript SDK
- Fewer examples and community support
- No Zod equivalent with tight MCP schema integration (though `serde` + `schemars` could work)
