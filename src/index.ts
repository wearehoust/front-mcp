#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { FrontClient, ApiTokenAuth } from "./client/front-client.js";
import { RateLimiter } from "./client/rate-limiter.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logging.level, config.logging.redact_fields);

  const apiToken = process.env["FRONT_API_TOKEN"];

  if (typeof apiToken !== "string" || apiToken.length === 0) {
    logger.error("No authentication configured. Set FRONT_API_TOKEN environment variable or configure OAuth.");
    process.exit(1);
  }

  logger.warn("Using API token authentication. OAuth is recommended for production use.");

  const authProvider = new ApiTokenAuth(apiToken);
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
