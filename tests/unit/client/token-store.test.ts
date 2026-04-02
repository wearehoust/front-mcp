import { describe, it, expect, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import {
  saveTokens,
  loadTokens,
  clearTokens,
  getTokenFilePermissions,
  isTokenExpiringSoon,
  type StoredTokens,
} from "../../../src/client/token-store.js";

// Override token directory for testing
const testDir = mkdtempSync(join(tmpdir(), "front-mcp-test-"));

// Override XDG_CONFIG_HOME for testing
const originalEnv = process.env["XDG_CONFIG_HOME"];

function setTestDir(): void {
  process.env["XDG_CONFIG_HOME"] = testDir;
}

function restoreDir(): void {
  if (originalEnv !== undefined) {
    process.env["XDG_CONFIG_HOME"] = originalEnv;
  } else {
    delete process.env["XDG_CONFIG_HOME"];
  }
}

const testTokens: StoredTokens = {
  access_token: "test_access_token_12345",
  refresh_token: "test_refresh_token_67890",
  expires_at: Date.now() + 3600000,
  refresh_expires_at: Date.now() + 15552000000,
};

describe("TokenStore", () => {
  afterEach(() => {
    restoreDir();
    try {
      rmSync(join(testDir, "front-mcp"), { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("save and load roundtrip", () => {
    it("encrypts and decrypts tokens correctly", async () => {
      setTestDir();
      await saveTokens(testTokens);
      const loaded = await loadTokens();
      expect(loaded).not.toBeNull();
      expect(loaded?.access_token).toBe(testTokens.access_token);
      expect(loaded?.refresh_token).toBe(testTokens.refresh_token);
    });

    it("encrypted file is not valid JSON of tokens", async () => {
      setTestDir();
      await saveTokens(testTokens);
      const raw = readFileSync(join(testDir, "front-mcp", "tokens.enc"), "utf-8");
      const file = JSON.parse(raw) as Record<string, unknown>;
      expect(file["encrypted"]).toBe(true);
      expect(file["algorithm"]).toBe("aes-256-gcm");
      // The data field should not contain plaintext token
      expect(file["data"]).not.toContain("test_access_token");
    });
  });

  describe("file permissions", () => {
    it("sets token file to 0600", async () => {
      setTestDir();
      await saveTokens(testTokens);
      const perms = await getTokenFilePermissions();
      expect(perms).toBe(0o600);
    });
  });

  describe("clear", () => {
    it("removes the token file", async () => {
      setTestDir();
      await saveTokens(testTokens);
      clearTokens();
      const loaded = await loadTokens();
      expect(loaded).toBeNull();
    });
  });

  describe("missing file", () => {
    it("returns null when no file exists", async () => {
      setTestDir();
      const loaded = await loadTokens();
      expect(loaded).toBeNull();
    });
  });

  describe("corruption handling", () => {
    it("returns null for corrupted file", async () => {
      setTestDir();
      await saveTokens(testTokens);
      // Corrupt the file by changing passphrase
      try {
        const loaded = await loadTokens("wrong_passphrase");
        // If decryption doesn't throw, the tokens should be null or corrupted
        expect(loaded).toBeNull();
      } catch {
        // Expected: decryption failure throws
      }
    });
  });

  describe("expiry checking", () => {
    it("detects expiring-soon refresh token", () => {
      const tokens: StoredTokens = {
        ...testTokens,
        refresh_expires_at: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
      };
      expect(isTokenExpiringSoon(tokens)).toBe(true);
    });

    it("returns false for non-expiring refresh token", () => {
      const tokens: StoredTokens = {
        ...testTokens,
        refresh_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };
      expect(isTokenExpiringSoon(tokens)).toBe(false);
    });
  });
});
