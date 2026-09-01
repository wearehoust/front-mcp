#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { FrontClient, ApiTokenAuth } from "./client/front-client.js";
import { RateLimiter } from "./client/rate-limiter.js";
import { OAuthManager } from "./client/oauth.js";
import { loadTokens } from "./client/token-store.js";
import { createServer } from "./server.js";
import { runDiagnostics, formatDiagnostics } from "./doctor.js";
import type { AuthProvider } from "./client/front-client.js";

async function handleAuth(config: ReturnType<typeof loadConfig>, logger: Logger): Promise<void> {
  const args = process.argv.slice(2);
  const oauthConfig = {
    clientId: config.auth.oauth.client_id,
    clientSecret: process.env[config.auth.oauth.client_secret_env] ?? "",
    redirectPort: config.auth.oauth.redirect_port,
    scopes: config.auth.oauth.scopes,
  };
  const oauth = new OAuthManager(oauthConfig, logger);

  if (args.includes("--status")) {
    const status = await oauth.getStatus();
    process.stderr.write(JSON.stringify(status, null, 2) + "\n");
    return;
  }

  if (args.includes("--clear")) {
    await oauth.clear();
    process.stderr.write("OAuth tokens cleared.\n");
    return;
  }

  await oauth.startAuthFlow();
  process.stderr.write("Authentication successful!\n");
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, "..", "package.json"), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "version" in parsed &&
      typeof (parsed as { version: unknown }).version === "string"
    ) {
      return (parsed as { version: string }).version;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

const VERSION = readPackageVersion();

const HELP_TEXT = `front-mcp — Secure MCP server for the Front Platform API

Usage:
  front-mcp              Start the MCP server (stdio transport)
  front-mcp auth         Authenticate via OAuth
  front-mcp auth --status  Check authentication status
  front-mcp auth --clear   Remove stored OAuth tokens

Options:
  --version, -v   Show version number
  --help, -h      Show this help message
  --doctor        Run diagnostics (check config, auth, connectivity)

Environment variables:
  FRONT_API_TOKEN           API token for authentication (fallback)
  FRONT_MCP_AUTH_METHOD     "oauth" or "api_token" (default: api_token)
  FRONT_MCP_OAUTH_SECRET    OAuth client secret
  FRONT_MCP_LOG_LEVEL       "error", "warn", "info", "debug" (default: info)
  FRONT_MCP_POLICY_FILE     Path to custom policy JSON file

Documentation: https://github.com/wearehoust/front-mcp
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle --version / -v
  if (args.includes("--version") || args.includes("-v")) {
    process.stderr.write(`front-mcp ${VERSION}\n`);
    return;
  }

  // Handle --help / -h
  if (args.includes("--help") || args.includes("-h")) {
    process.stderr.write(HELP_TEXT);
    return;
  }

  // Handle --doctor
  if (args.includes("--doctor")) {
    const results = await runDiagnostics();
    process.stderr.write(formatDiagnostics(results));
    const failures = results.filter((r) => r.status === "fail").length;
    process.exit(failures > 0 ? 1 : 0);
  }

  const config = loadConfig();
  const logger = new Logger(config.logging.level, config.logging.redact_fields);

  // Handle auth subcommand
  if (args[0] === "auth") {
    await handleAuth(config, logger);
    return;
  }

  // Handle unknown subcommands
  if (args.length > 0 && args[0] !== undefined && !args[0].startsWith("-")) {
    process.stderr.write(`Unknown command: "${args[0]}"\n\n`);
    process.stderr.write(HELP_TEXT);
    process.exit(1);
  }

  // Resolve auth provider
  let authProvider: AuthProvider;

  if (config.auth.method === "oauth") {
    const tokens = await loadTokens();
    if (tokens !== null) {
      const oauthConfig = {
        clientId: config.auth.oauth.client_id,
        clientSecret: process.env[config.auth.oauth.client_secret_env] ?? "",
        redirectPort: config.auth.oauth.redirect_port,
        scopes: config.auth.oauth.scopes,
      };
      authProvider = new OAuthManager(oauthConfig, logger);
      logger.info("Using OAuth authentication.");
    } else {
      logger.error("OAuth configured but no tokens found. Run 'front-mcp auth' first, or switch to API token by setting FRONT_API_TOKEN.");
      process.exit(1);
    }
  } else {
    const apiToken = process.env["FRONT_API_TOKEN"];
    if (typeof apiToken !== "string" || apiToken.length === 0) {
      logger.error("No authentication configured. Set FRONT_API_TOKEN or configure OAuth.");
      process.exit(1);
    }
    logger.warn("Using API token authentication. OAuth is recommended for production use.");
    authProvider = new ApiTokenAuth(apiToken);
  }

  const rateLimiter = new RateLimiter(config.rate_limit.proactive_delay_threshold);

  const client = new FrontClient(authProvider, {
    rateLimiter,
    retryOptions: {
      maxRetries: config.rate_limit.max_retries,
      backoffBaseMs: config.rate_limit.backoff_base_ms,
      backoffMaxMs: config.rate_limit.backoff_max_ms,
    },
    logger,
  });

  const server = createServer(client, config);

  const transport = new StdioServerTransport();
  logger.info("Starting Front MCP Server via stdio transport");
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  const isDebug =
    process.env["LOG_LEVEL"] === "debug" ||
    process.env["FRONT_MCP_LOG_LEVEL"] === "debug";
  if (isDebug && error instanceof Error && typeof error.stack === "string") {
    process.stderr.write(`Fatal error: ${message}\n${error.stack}\n`);
  } else {
    process.stderr.write(`Fatal error: ${message}\n`);
  }
  process.exit(1);
});
