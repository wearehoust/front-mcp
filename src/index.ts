#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { FrontClient, ApiTokenAuth } from "./client/front-client.js";
import { RateLimiter } from "./client/rate-limiter.js";
import { OAuthManager } from "./client/oauth.js";
import { loadTokens } from "./client/token-store.js";
import { createServer } from "./server.js";
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

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logging.level, config.logging.redact_fields);

  // Handle auth subcommand
  if (process.argv[2] === "auth") {
    await handleAuth(config, logger);
    return;
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
      logger.error("OAuth configured but no tokens found. Run 'front-mcp auth' first.");
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
  process.stderr.write(`Fatal error: ${message}\n`);
  process.exit(1);
});
