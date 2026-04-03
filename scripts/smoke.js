#!/usr/bin/env node

// Smoke test: starts the MCP server, sends tools/list, verifies 26 tools
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const serverPath = path.join(__dirname, "..", "dist", "index.js");
const request = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
});

try {
  const result = execFileSync("node", [serverPath], {
    input: request + "\n",
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, FRONT_API_TOKEN: "smoke_test_token" },
  });

  // Parse the JSON-RPC response from stdout (may have multiple lines)
  const lines = result.trim().split("\n");
  let toolCount = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.result && parsed.result.tools) {
        toolCount = parsed.result.tools.length;
        break;
      }
    } catch {
      // skip non-JSON lines
    }
  }

  if (toolCount < 26) {
    process.stderr.write(
      `Smoke test FAILED: expected 26+ tools, got ${toolCount}\n`,
    );
    process.exit(1);
  }

  process.stderr.write(`Smoke test PASSED: ${toolCount} tools registered\n`);
} catch (error) {
  process.stderr.write(`Smoke test FAILED: ${error.message}\n`);
  process.exit(1);
}
