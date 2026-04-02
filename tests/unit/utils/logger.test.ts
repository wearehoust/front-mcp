import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "../../../src/utils/logger.js";

describe("Logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes to stderr, never stdout", () => {
    const logger = new Logger("info");
    logger.info("test message");

    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("outputs structured JSON", () => {
    const logger = new Logger("info");
    logger.info("test message");

    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed["level"]).toBe("info");
    expect(parsed["message"]).toBe("test message");
    expect(typeof parsed["timestamp"]).toBe("string");
  });

  it("filters by log level", () => {
    const logger = new Logger("warn");
    logger.debug("should not appear");
    logger.info("should not appear");
    logger.warn("should appear");
    logger.error("should appear");

    expect(stderrSpy).toHaveBeenCalledTimes(2);
  });

  it("redacts sensitive fields in context", () => {
    const logger = new Logger("info");
    logger.info("user data", {
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
      access_token: "tok_abc",
    });

    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed["name"]).toBe("Test User");
    expect(parsed["email"]).toBe("[REDACTED]");
    expect(parsed["password"]).toBe("[REDACTED]");
    expect(parsed["access_token"]).toBe("[REDACTED]");
  });

  it("redacts nested sensitive fields", () => {
    const logger = new Logger("info");
    logger.info("nested data", {
      user: {
        name: "Test",
        phone: "555-1234",
        details: {
          refresh_token: "rt_xyz",
        },
      },
    });

    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    const user = parsed["user"] as Record<string, unknown>;
    expect(user["name"]).toBe("Test");
    expect(user["phone"]).toBe("[REDACTED]");
    const details = user["details"] as Record<string, unknown>;
    expect(details["refresh_token"]).toBe("[REDACTED]");
  });

  it("handles circular references", () => {
    const logger = new Logger("info");
    const obj: Record<string, unknown> = { name: "test" };
    obj["self"] = obj;
    logger.info("circular", obj);

    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed["self"]).toBe("[Circular]");
  });

  it("redacts authorization headers case-insensitively", () => {
    const logger = new Logger("info");
    logger.info("request", {
      Authorization: "Bearer tok_secret",
    });

    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed["Authorization"]).toBe("[REDACTED]");
  });
});
