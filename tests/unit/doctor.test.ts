import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runDiagnostics, formatDiagnostics, type DiagnosticResult } from "../../src/doctor.js";

describe("Doctor", () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns diagnostic results array", async () => {
    const results = await runDiagnostics();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("checks Node.js version", async () => {
    const results = await runDiagnostics();
    const nodeCheck = results.find((r) => r.name === "Node.js version");
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck?.status).toBe("pass");
  });

  it("checks for config file", async () => {
    const results = await runDiagnostics();
    const configCheck = results.find((r) => r.name === "Config file");
    expect(configCheck).toBeDefined();
  });

  it("checks for authentication", async () => {
    const results = await runDiagnostics();
    const authCheck = results.find((r) => r.name === "Authentication");
    expect(authCheck).toBeDefined();
  });

  it("each result has name, status, and message", async () => {
    const results = await runDiagnostics();
    for (const result of results) {
      expect(typeof result.name).toBe("string");
      expect(["pass", "warn", "fail"]).toContain(result.status);
      expect(typeof result.message).toBe("string");
    }
  });

  it("formatDiagnostics produces readable output", () => {
    const results: DiagnosticResult[] = [
      { name: "Test", status: "pass", message: "OK" },
      { name: "Warn", status: "warn", message: "Hmm" },
    ];
    const output = formatDiagnostics(results);
    expect(output).toContain("Test");
    expect(output).toContain("1 passed");
    expect(output).toContain("1 warnings");
  });
});
