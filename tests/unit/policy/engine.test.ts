import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PolicyEngine } from "../../../src/policy/engine.js";
import { existsSync, readFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
}));

describe("PolicyEngine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("default decisions", () => {
    it("allows read actions by default", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("conversations", "list");
      expect(result.decision).toBe("allow");
      expect(result.tier).toBe("read");
    });

    it("requires confirmation for write actions by default", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("conversations", "create");
      expect(result.decision).toBe("confirm");
      expect(result.tier).toBe("write");
    });

    it("denies destructive actions by default", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("conversations", "delete");
      expect(result.decision).toBe("deny");
      expect(result.tier).toBe("destructive");
    });
  });

  describe("confirmation flow", () => {
    it("returns confirm prompt on first call without confirm param", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("conversations", "create", {
        action: "create",
        subject: "Test",
      });

      expect(result.decision).toBe("confirm");
      expect(result.message).toContain("CONFIRMATION REQUIRED");
      expect(result.message).toContain("conversations.create");
      expect(result.message).toContain("confirm: true");
    });

    it("allows execution when confirm is true", () => {
      const engine = new PolicyEngine();

      // First call: get confirmation prompt
      engine.evaluate("conversations", "create", {
        action: "create",
        subject: "Test",
      });

      // Second call: confirm
      const result = engine.evaluate("conversations", "create", {
        action: "create",
        subject: "Test",
        confirm: true,
      });

      expect(result.decision).toBe("allow");
    });

    it("does not make API call when confirm is missing", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("messages", "create", {
        action: "create",
        conversation_id: "cnv_123",
        body: "Hello",
      });

      expect(result.decision).toBe("confirm");
    });
  });

  describe("deny messaging", () => {
    it("returns policy change instructions on deny", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("conversations", "delete");

      expect(result.decision).toBe("deny");
      expect(result.message).toContain("DENIED");
      expect(result.message).toContain("conversations.delete");
      expect(result.message).toContain("destructive");
      expect(result.message).toContain("policy.json");
      expect(result.message).toContain('"decision": "confirm"');
    });
  });

  describe("override precedence", () => {
    it("specific action override beats wildcard", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          overrides: [
            { tool: "conversations", action: "*", decision: "deny" },
            { tool: "conversations", action: "list", decision: "allow" },
          ],
        }),
      );

      const engine = new PolicyEngine("/test/policy.json");
      // Specific override allows list
      expect(engine.evaluate("conversations", "list").decision).toBe("allow");
      // Wildcard denies everything else
      expect(engine.evaluate("conversations", "create").decision).toBe("deny");
    });

    it("wildcard override beats tier default", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          overrides: [
            { tool: "conversations", action: "*", decision: "allow" },
          ],
        }),
      );

      const engine = new PolicyEngine("/test/policy.json");
      // Normally destructive is deny, but wildcard overrides
      expect(engine.evaluate("conversations", "delete").decision).toBe("allow");
    });

    it("tier default applies when no overrides match", () => {
      const engine = new PolicyEngine();
      expect(engine.evaluate("conversations", "list").decision).toBe("allow");
      expect(engine.evaluate("conversations", "create").decision).toBe("confirm");
      expect(engine.evaluate("conversations", "delete").decision).toBe("deny");
    });
  });

  describe("unknown actions", () => {
    it("unknown action defaults to write tier (safe default)", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("conversations", "totally_unknown_action");
      expect(result.tier).toBe("write");
      expect(result.decision).toBe("confirm");
    });

    it("unknown tool defaults to write tier", () => {
      const engine = new PolicyEngine();
      const result = engine.evaluate("totally_unknown_tool", "some_action");
      expect(result.tier).toBe("write");
      expect(result.decision).toBe("confirm");
    });
  });

  describe("policy file loading", () => {
    it("loads policy from file when it exists", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          defaults: { read: "allow", write: "allow", destructive: "confirm" },
        }),
      );

      const engine = new PolicyEngine("/test/policy.json");
      // Destructive is now confirm instead of deny
      expect(engine.evaluate("conversations", "delete").decision).toBe("confirm");
    });

    it("falls back to defaults when file is missing", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const engine = new PolicyEngine("/nonexistent/policy.json");
      expect(engine.evaluate("conversations", "delete").decision).toBe("deny");
    });

    it("falls back to defaults when file has invalid JSON", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("not json");
      const engine = new PolicyEngine("/test/policy.json");
      expect(engine.evaluate("conversations", "delete").decision).toBe("deny");
    });
  });
});
