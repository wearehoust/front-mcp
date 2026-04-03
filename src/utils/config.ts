import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SanitizationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  redacted_fields: z.array(z.string()).default([]),
  redacted_patterns: z.array(z.string()).default([]),
  replacement_text: z.string().default("[REDACTED]"),
});

const RateLimitConfigSchema = z.object({
  proactive_delay_threshold: z.number().min(0).max(1).default(0.1),
  max_retries: z.number().int().min(0).max(10).default(3),
  backoff_base_ms: z.number().int().min(100).default(1000),
  backoff_max_ms: z.number().int().min(1000).default(60000),
});

const PaginationConfigSchema = z.object({
  default_limit: z.number().int().min(1).max(100).default(50),
  max_auto_paginate_pages: z.number().int().min(1).max(100).default(10),
});

const OAuthConfigSchema = z.object({
  client_id: z.string().default(""),
  client_secret_env: z.string().default("FRONT_MCP_OAUTH_SECRET"),
  redirect_port: z.number().int().default(9876),
  scopes: z.array(z.string()).default([]),
});

const AuthConfigSchema = z.object({
  method: z.enum(["oauth", "api_token"]).default("api_token"),
  oauth: OAuthConfigSchema.default({}),
  api_token_env: z.string().default("FRONT_API_TOKEN"),
});

const LoggingConfigSchema = z.object({
  level: z.enum(["error", "warn", "info", "debug"]).default("info"),
  redact_fields: z
    .array(z.string())
    .default(["phone", "email", "password", "access_token", "refresh_token", "client_secret"]),
});

export const ConfigSchema = z.object({
  auth: AuthConfigSchema.default({}),
  logging: LoggingConfigSchema.default({}),
  rate_limit: RateLimitConfigSchema.default({}),
  pagination: PaginationConfigSchema.default({}),
  sanitization: SanitizationConfigSchema.default({}),
  policy_file: z.string().default(""),
});

export type Config = z.infer<typeof ConfigSchema>;

function getConfigPaths(): string[] {
  const paths: string[] = [];
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  if (typeof xdgConfigHome === "string" && xdgConfigHome.length > 0) {
    paths.push(join(xdgConfigHome, "front-mcp", "config.json"));
  }
  paths.push(join(homedir(), ".front-mcp", "config.json"));
  return paths;
}

function loadConfigFile(): Record<string, unknown> {
  for (const configPath of getConfigPaths()) {
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf-8");
      return JSON.parse(raw) as Record<string, unknown>;
    }
  }
  return {};
}

function applyEnvOverrides(config: Record<string, unknown>): Record<string, unknown> {
  const envMap: Record<string, (c: Record<string, unknown>) => void> = {
    FRONT_MCP_LOG_LEVEL: (c) => {
      const auth = (c["logging"] ?? {}) as Record<string, unknown>;
      auth["level"] = process.env["FRONT_MCP_LOG_LEVEL"];
      c["logging"] = auth;
    },
    FRONT_MCP_AUTH_METHOD: (c) => {
      const auth = (c["auth"] ?? {}) as Record<string, unknown>;
      auth["method"] = process.env["FRONT_MCP_AUTH_METHOD"];
      c["auth"] = auth;
    },
    FRONT_MCP_POLICY_FILE: (c) => {
      c["policy_file"] = process.env["FRONT_MCP_POLICY_FILE"];
    },
  };

  for (const [envKey, applier] of Object.entries(envMap)) {
    if (typeof process.env[envKey] === "string") {
      applier(config);
    }
  }

  return config;
}

export function loadConfig(): Config {
  const fileConfig = loadConfigFile();
  const merged = applyEnvOverrides(fileConfig);
  return ConfigSchema.parse(merged);
}
