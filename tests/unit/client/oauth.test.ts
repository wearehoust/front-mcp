import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { OAuthManager } from "../../../src/client/oauth.js";
import { Logger } from "../../../src/utils/logger.js";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";

const mockConfig = {
  clientId: "test_client_id",
  clientSecret: "test_client_secret",
  redirectPort: 19876,
  scopes: [],
};

describe("OAuthManager", () => {
  const originalXdg = process.env["XDG_CONFIG_HOME"];

  beforeEach(() => {
    // Isolate token storage to a temp dir so real tokens don't interfere
    const testDir = mkdtempSync(join(tmpdir(), "front-mcp-oauth-test-"));
    process.env["XDG_CONFIG_HOME"] = testDir;
  });

  afterEach(() => {
    if (originalXdg !== undefined) {
      process.env["XDG_CONFIG_HOME"] = originalXdg;
    } else {
      delete process.env["XDG_CONFIG_HOME"];
    }
    vi.restoreAllMocks();
  });

  describe("getToken", () => {
    it("throws when no tokens are available", async () => {
      const logger = new Logger("error");
      const oauth = new OAuthManager(mockConfig, logger);

      await expect(oauth.getToken()).rejects.toThrow(
        "No OAuth tokens available",
      );
    });
  });

  describe("getStatus", () => {
    it("returns unauthenticated when no tokens exist", async () => {
      const logger = new Logger("error");
      const oauth = new OAuthManager(mockConfig, logger);

      const status = await oauth.getStatus();
      expect(status.authenticated).toBe(false);
      expect(status.method).toBe("oauth");
    });
  });

  describe("token refresh", () => {
    it("throws clear message on refresh failure", async () => {
      server.use(
        http.post("https://app.frontapp.com/oauth/token", () => {
          return HttpResponse.json(
            { error: "invalid_grant" },
            { status: 401 },
          );
        }),
      );

      const logger = new Logger("error");
      const oauth = new OAuthManager(mockConfig, logger);

      const expiredTokens = {
        access_token: "expired_token",
        refresh_token: "valid_refresh",
        expires_at: Date.now() - 1000,
        refresh_expires_at: Date.now() + 3600000,
      };

      (oauth as Record<string, unknown>)["tokens"] = expiredTokens;

      await expect(oauth.getToken()).rejects.toThrow(
        "Token refresh failed",
      );
    });

    it("deduplicates concurrent refresh calls into a single token request", async () => {
      let refreshCallCount = 0;
      server.use(
        http.post("https://app.frontapp.com/oauth/token", async () => {
          refreshCallCount += 1;
          // Slight delay so the parallel callers all observe an in-flight refresh
          await new Promise((r) => setTimeout(r, 20));
          return HttpResponse.json({
            access_token: "new_access",
            refresh_token: "new_refresh",
            token_type: "Bearer",
            expires_in: 3600,
          });
        }),
      );

      const logger = new Logger("error");
      const oauth = new OAuthManager(mockConfig, logger);

      (oauth as Record<string, unknown>)["tokens"] = {
        access_token: "expired",
        refresh_token: "old_refresh",
        expires_at: Date.now() - 1000,
        refresh_expires_at: Date.now() + 3600 * 1000,
      };

      const tokens = await Promise.all([
        oauth.getToken(),
        oauth.getToken(),
        oauth.getToken(),
      ]);

      expect(tokens).toEqual(["new_access", "new_access", "new_access"]);
      expect(refreshCallCount).toBe(1);
    });

    it("rejects token endpoint responses missing required fields", async () => {
      server.use(
        http.post("https://app.frontapp.com/oauth/token", () => {
          return HttpResponse.json({ token_type: "Bearer" });
        }),
      );

      const logger = new Logger("error");
      const oauth = new OAuthManager(mockConfig, logger);

      (oauth as Record<string, unknown>)["tokens"] = {
        access_token: "expired",
        refresh_token: "old_refresh",
        expires_at: Date.now() - 1000,
        refresh_expires_at: Date.now() + 3600 * 1000,
      };

      await expect(oauth.getToken()).rejects.toThrow(
        /unexpected payload/i,
      );
    });
  });
});
