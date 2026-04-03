import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadTokens } from "./client/token-store.js";
import { getAllActionTiers } from "./policy/default-policy.js";

export interface DiagnosticResult {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // 1. Node.js version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0] ?? "0", 10);
  results.push({
    name: "Node.js version",
    status: major >= 20 ? "pass" : "fail",
    message: major >= 20
      ? `v${nodeVersion} (>= 20 required)`
      : `v${nodeVersion} — Node.js 20+ is required`,
  });

  // 2. Config file
  const configPaths = [
    join(process.env["XDG_CONFIG_HOME"] ?? "", "front-mcp", "config.json"),
    join(homedir(), ".front-mcp", "config.json"),
  ].filter((p) => p.length > 10);

  const configFound = configPaths.find((p) => existsSync(p));
  results.push({
    name: "Config file",
    status: typeof configFound === "string" ? "pass" : "warn",
    message: typeof configFound === "string"
      ? `Found at ${configFound}`
      : "No config file found (using defaults). Create ~/.front-mcp/config.json for custom settings.",
  });

  // 3. Authentication
  const apiToken = process.env["FRONT_API_TOKEN"];
  const hasApiToken = typeof apiToken === "string" && apiToken.length > 0;
  const oauthTokens = await loadTokens();
  const hasOAuth = oauthTokens !== null;

  if (hasOAuth) {
    const expired = Date.now() >= oauthTokens.expires_at;
    results.push({
      name: "Authentication",
      status: expired ? "warn" : "pass",
      message: expired
        ? "OAuth tokens found but access token expired. Will refresh automatically."
        : "OAuth tokens found and valid.",
    });
  } else if (hasApiToken) {
    results.push({
      name: "Authentication",
      status: "warn",
      message: "Using API token (FRONT_API_TOKEN). OAuth is recommended for production.",
    });
  } else {
    results.push({
      name: "Authentication",
      status: "fail",
      message: "No authentication configured. Set FRONT_API_TOKEN or run 'front-mcp auth'.",
    });
  }

  // 4. Policy file
  const policyPath = join(homedir(), ".front-mcp", "policy.json");
  results.push({
    name: "Policy file",
    status: existsSync(policyPath) ? "pass" : "warn",
    message: existsSync(policyPath)
      ? `Custom policy at ${policyPath}`
      : "No custom policy (using defaults: read=allow, write=confirm, destructive=deny).",
  });

  // 5. Tool coverage
  const tiers = getAllActionTiers();
  const toolCount = Object.keys(tiers).length;
  let actionCount = 0;
  for (const actions of Object.values(tiers)) {
    actionCount += Object.keys(actions).length;
  }
  results.push({
    name: "Tool coverage",
    status: "pass",
    message: `${String(toolCount)} tools, ${String(actionCount)} actions registered.`,
  });

  // 6. Front API connectivity
  if (hasOAuth || hasApiToken) {
    try {
      const token = hasOAuth ? oauthTokens.access_token : (apiToken ?? "");
      const response = await fetch("https://api2.frontapp.com/me", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (response.ok) {
        results.push({
          name: "Front API connectivity",
          status: "pass",
          message: `Connected (HTTP ${String(response.status)}).`,
        });
      } else {
        results.push({
          name: "Front API connectivity",
          status: "fail",
          message: `HTTP ${String(response.status)}. Check your credentials.`,
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      results.push({
        name: "Front API connectivity",
        status: "fail",
        message: `Cannot reach api2.frontapp.com: ${msg}`,
      });
    }
  } else {
    results.push({
      name: "Front API connectivity",
      status: "fail",
      message: "Skipped — no credentials configured.",
    });
  }

  return results;
}

export function formatDiagnostics(results: DiagnosticResult[]): string {
  const icons = { pass: "\x1b[32m\u2713\x1b[0m", warn: "\x1b[33m!\x1b[0m", fail: "\x1b[31m\u2717\x1b[0m" };
  const lines = results.map((r) => `  ${icons[r.status]} ${r.name}: ${r.message}`);
  const passed = results.filter((r) => r.status === "pass").length;
  const warnings = results.filter((r) => r.status === "warn").length;
  const failures = results.filter((r) => r.status === "fail").length;

  return [
    "",
    "  Front MCP — Diagnostics",
    "  =======================",
    "",
    ...lines,
    "",
    `  ${String(passed)} passed, ${String(warnings)} warnings, ${String(failures)} failures`,
    "",
  ].join("\n");
}
