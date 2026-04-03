#!/usr/bin/env node

// Live API test — sends one read request per tool through a single server instance
const { spawn } = require("node:child_process");
const path = require("node:path");

const tests = [
  { name: "token_identity", args: { action: "get" } },
  { name: "conversations", args: { action: "list", limit: 1 } },
  { name: "contacts", args: { action: "list", limit: 1 } },
  { name: "tags", args: { action: "list", limit: 1 } },
  { name: "inboxes", args: { action: "list", limit: 1 } },
  { name: "accounts", args: { action: "list" } },
  { name: "channels", args: { action: "list", limit: 1 } },
  { name: "comments", args: { action: "list", conversation_id: "cnv_1kv80i8n", limit: 1 } },
  { name: "contact_groups", args: { action: "list" } },
  { name: "contact_lists", args: { action: "list" } },
  { name: "contact_notes", args: { action: "list", contact_id: "crd_1en1gp0" } },
  { name: "custom_fields", args: { action: "list_for_contacts" } },
  { name: "drafts", args: { action: "list", conversation_id: "cnv_1kv80i8n" } },
  { name: "events", args: { action: "list", limit: 1 } },
  { name: "knowledge_bases", args: { action: "list" } },
  { name: "links", args: { action: "list" } },
  { name: "message_template_folders", args: { action: "list" } },
  { name: "message_templates", args: { action: "list" } },
  { name: "messages", args: { action: "get", message_id: "msg_359uagnr" } },
  { name: "rules", args: { action: "list" } },
  { name: "shifts", args: { action: "list" } },
  { name: "signatures", args: { action: "list", teammate_id: "tea_1gnwk" } },
  { name: "teammate_groups", args: { action: "list" } },
  { name: "teammates", args: { action: "list" } },
  { name: "teams", args: { action: "list" } },
  // Policy tests
  { name: "tags", args: { action: "create", name: "test" }, expect: "confirm" },
  { name: "tags", args: { action: "delete", tag_id: "tag_1" }, expect: "deny" },
];

const serverPath = path.join(__dirname, "..", "dist", "index.js");
const child = spawn("node", [serverPath], {
  env: { ...process.env },
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
let currentTest = 0;
let passed = 0;
let failed = 0;
const failures = [];

child.stdout.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (line.trim().length === 0) continue;
    try {
      const response = JSON.parse(line);
      const test = tests[currentTest];
      const result = response.result;
      const isError = result?.isError === true;
      const text = result?.content?.[0]?.text || "";

      if (test.expect === "confirm") {
        if (text.includes("CONFIRMATION REQUIRED")) {
          process.stderr.write(`  ✓ ${test.name}.${test.args.action} (confirm)\n`);
          passed++;
        } else {
          process.stderr.write(`  ✗ ${test.name}.${test.args.action} — expected confirm, got: ${text.substring(0, 80)}\n`);
          failed++;
          failures.push(`${test.name}.${test.args.action}: expected confirm`);
        }
      } else if (test.expect === "deny") {
        if (text.includes("DENIED")) {
          process.stderr.write(`  ✓ ${test.name}.${test.args.action} (denied)\n`);
          passed++;
        } else {
          process.stderr.write(`  ✗ ${test.name}.${test.args.action} — expected deny, got: ${text.substring(0, 80)}\n`);
          failed++;
          failures.push(`${test.name}.${test.args.action}: expected deny`);
        }
      } else if (isError) {
        process.stderr.write(`  ✗ ${test.name}.${test.args.action} — ${text.substring(0, 80)}\n`);
        failed++;
        failures.push(`${test.name}.${test.args.action}: ${text.substring(0, 100)}`);
      } else {
        process.stderr.write(`  ✓ ${test.name}.${test.args.action}\n`);
        passed++;
      }

      currentTest++;
      if (currentTest < tests.length) {
        sendNext();
      } else {
        finish();
      }
    } catch {
      // incomplete JSON, wait for more data
    }
  }
});

child.stderr.on("data", () => {
  // suppress server logs
});

function sendNext() {
  const test = tests[currentTest];
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id: currentTest + 1,
    method: "tools/call",
    params: { name: test.name, arguments: test.args },
  });
  child.stdin.write(request + "\n");
}

function finish() {
  process.stderr.write(`\n  === ${passed} passed, ${failed} failed out of ${tests.length} ===\n`);
  if (failures.length > 0) {
    process.stderr.write("\n  Failures:\n");
    for (const f of failures) {
      process.stderr.write(`    - ${f}\n`);
    }
  }
  child.kill();
  process.exit(failed > 0 ? 1 : 0);
}

// Start
process.stderr.write("\n  Live API Test — Front MCP Server\n  ================================\n\n");
sendNext();

// Safety timeout
setTimeout(() => {
  process.stderr.write(`\n  TIMEOUT after 120s (completed ${currentTest}/${tests.length})\n`);
  child.kill();
  process.exit(1);
}, 120000);
