import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, ConfigSchema } from "../../../src/utils/config.js";
import { existsSync, readFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.mocked(existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("loadConfig", () => {
    it("returns sensible defaults when no config file exists", () => {
      const config = loadConfig();
      expect(config.auth.method).toBe("api_token");
      expect(config.logging.level).toBe("info");
      expect(config.rate_limit.max_retries).toBe(3);
      expect(config.pagination.default_limit).toBe(50);
      expect(config.sanitization.enabled).toBe(true);
    });

    it("loads config from file", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          auth: { method: "oauth" },
          logging: { level: "debug" },
        }),
      );

      const config = loadConfig();
      expect(config.auth.method).toBe("oauth");
      expect(config.logging.level).toBe("debug");
    });

    it("applies env var overrides", () => {
      process.env["FRONT_MCP_LOG_LEVEL"] = "error";
      const config = loadConfig();
      expect(config.logging.level).toBe("error");
    });

    it("applies FRONT_MCP_AUTH_METHOD env override", () => {
      process.env["FRONT_MCP_AUTH_METHOD"] = "oauth";
      const config = loadConfig();
      expect(config.auth.method).toBe("oauth");
    });

    it("applies FRONT_MCP_POLICY_FILE env override", () => {
      process.env["FRONT_MCP_POLICY_FILE"] = "/custom/policy.json";
      const config = loadConfig();
      expect(config.policy_file).toBe("/custom/policy.json");
    });

    it("env vars override file values", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ logging: { level: "debug" } }),
      );
      process.env["FRONT_MCP_LOG_LEVEL"] = "warn";

      const config = loadConfig();
      expect(config.logging.level).toBe("warn");
    });
  });

  describe("ConfigSchema", () => {
    it("rejects invalid log level", () => {
      const result = ConfigSchema.safeParse({
        logging: { level: "verbose" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid auth method", () => {
      const result = ConfigSchema.safeParse({
        auth: { method: "basic" },
      });
      expect(result.success).toBe(false);
    });

    it("applies defaults for missing fields", () => {
      const result = ConfigSchema.parse({});
      expect(result.rate_limit.backoff_base_ms).toBe(1000);
      expect(result.rate_limit.backoff_max_ms).toBe(60000);
      expect(result.pagination.max_auto_paginate_pages).toBe(10);
    });
  });
});
