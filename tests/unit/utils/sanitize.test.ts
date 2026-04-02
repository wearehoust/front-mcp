import { describe, it, expect } from "vitest";
import {
  sanitize,
  createSanitizationConfig,
  type SanitizationConfig,
} from "../../../src/utils/sanitize.js";

describe("Sanitizer", () => {
  let config: SanitizationConfig;

  beforeEach(() => {
    config = createSanitizationConfig();
  });

  it("redacts default sensitive fields", () => {
    const input = {
      name: "Test",
      phone: "555-1234",
      password: "secret",
      api_key: "key_123",
    };

    const result = sanitize(input, config) as Record<string, unknown>;
    expect(result["name"]).toBe("Test");
    expect(result["phone"]).toBe("[REDACTED]");
    expect(result["password"]).toBe("[REDACTED]");
    expect(result["api_key"]).toBe("[REDACTED]");
  });

  it("redacts nested sensitive fields", () => {
    const input = {
      user: {
        name: "Test",
        details: {
          phone_number: "555-1234",
          social_security: "123-45-6789",
        },
      },
    };

    const result = sanitize(input, config) as Record<string, unknown>;
    const user = result["user"] as Record<string, unknown>;
    expect(user["name"]).toBe("Test");
    const details = user["details"] as Record<string, unknown>;
    expect(details["phone_number"]).toBe("[REDACTED]");
    expect(details["social_security"]).toBe("[REDACTED]");
  });

  it("handles arrays", () => {
    const input = {
      contacts: [
        { name: "A", phone: "111" },
        { name: "B", phone: "222" },
      ],
    };

    const result = sanitize(input, config) as Record<string, unknown>;
    const contacts = result["contacts"] as Record<string, unknown>[];
    expect(contacts[0]!["name"]).toBe("A");
    expect(contacts[0]!["phone"]).toBe("[REDACTED]");
    expect(contacts[1]!["name"]).toBe("B");
    expect(contacts[1]!["phone"]).toBe("[REDACTED]");
  });

  it("handles null and undefined values", () => {
    expect(sanitize(null, config)).toBeNull();
    expect(sanitize(undefined, config)).toBeUndefined();
  });

  it("handles primitive values", () => {
    expect(sanitize(42, config)).toBe(42);
    expect(sanitize("hello", config)).toBe("hello");
    expect(sanitize(true, config)).toBe(true);
  });

  it("handles circular references", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj["self"] = obj;

    const result = sanitize(obj, config) as Record<string, unknown>;
    expect(result["name"]).toBe("test");
    expect(result["self"]).toBe("[REDACTED]");
  });

  it("does not redact page_token (token is NOT in redacted fields)", () => {
    const input = {
      page_token: "abc123",
      next_page_token: "def456",
      access_token: "secret_tok",
    };

    const result = sanitize(input, config) as Record<string, unknown>;
    expect(result["page_token"]).toBe("abc123");
    expect(result["next_page_token"]).toBe("def456");
    expect(result["access_token"]).toBe("[REDACTED]");
  });

  it("respects case-insensitive field matching", () => {
    const input = {
      Password: "secret",
      PHONE: "555-1234",
      Credit_Card: "4111-1111-1111-1111",
    };

    const result = sanitize(input, config) as Record<string, unknown>;
    expect(result["Password"]).toBe("[REDACTED]");
    expect(result["PHONE"]).toBe("[REDACTED]");
    expect(result["Credit_Card"]).toBe("[REDACTED]");
  });

  it("supports custom redacted fields", () => {
    const customConfig = createSanitizationConfig({
      redacted_fields: ["custom_field"],
    });

    const input = { custom_field: "value", name: "test" };
    const result = sanitize(input, customConfig) as Record<string, unknown>;
    expect(result["custom_field"]).toBe("[REDACTED]");
    expect(result["name"]).toBe("test");
  });

  it("supports regex pattern redaction in string values", () => {
    const customConfig = createSanitizationConfig({
      redacted_patterns: ["\\b\\d{3}-\\d{2}-\\d{4}\\b"],
    });

    const input = { note: "SSN is 123-45-6789 in the file" };
    const result = sanitize(input, customConfig) as Record<string, unknown>;
    expect(result["note"]).toBe("SSN is [REDACTED] in the file");
  });

  it("returns data unchanged when disabled", () => {
    const disabledConfig = createSanitizationConfig({ enabled: false });
    const input = { password: "secret", phone: "555" };
    const result = sanitize(input, disabledConfig) as Record<string, unknown>;
    expect(result["password"]).toBe("secret");
    expect(result["phone"]).toBe("555");
  });

  it("supports custom replacement text", () => {
    const customConfig = createSanitizationConfig({
      replacement_text: "***",
    });

    const input = { password: "secret" };
    const result = sanitize(input, customConfig) as Record<string, unknown>;
    expect(result["password"]).toBe("***");
  });
});
