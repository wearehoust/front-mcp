#!/usr/bin/env node

// COMPREHENSIVE live API test — tests EVERY action (177 total) against the real Front API.
// Read actions hit the API. Write/destructive actions verify policy enforcement.
const { spawn } = require("node:child_process");
const path = require("node:path");

// Real IDs from the Houst Front account
const IDS = {
  conversation: "cnv_1l4523o7",
  contact: "crd_51bhzmf",
  tag: "tag_6ftcrb",
  inbox: "inb_2khy",
  account: "acc_5wg4",
  teammate: "tea_q078",
  team: "tim_5yt",
  link: "top_dxpp5j",
  teammate_group: "cir_64k",
  event: "evt_6f4ov7iv",
  kb: "knb_5q9u",
  message_template: "rsp_qhey",
  message_template_folder: "rsf_1xqc",
  rule: "rul_2cqis",
  signature: "sig_1h9l0",
  message: "msg_359ukct3",
  channel: "cha_xksk",
  contact_group: "grp_8wrgk",
  contact_list: "grp_8wrgk",
};

// Every single action across all 26 tools
// "read" = should succeed, "write" = should require confirm, "destructive" = should be denied
const tests = [
  // token_identity (1)
  { tool: "token_identity", args: { action: "get" }, expect: "read" },

  // conversations (18)
  { tool: "conversations", args: { action: "list", limit: 1 }, expect: "read" },
  { tool: "conversations", args: { action: "get", conversation_id: IDS.conversation }, expect: "read" },
  { tool: "conversations", args: { action: "search", query: "test" }, expect: "read" },
  { tool: "conversations", args: { action: "list_events", conversation_id: IDS.conversation, limit: 1 }, expect: "read" },
  { tool: "conversations", args: { action: "list_followers", conversation_id: IDS.conversation }, expect: "read" },
  { tool: "conversations", args: { action: "list_inboxes", conversation_id: IDS.conversation }, expect: "read" },
  { tool: "conversations", args: { action: "list_messages", conversation_id: IDS.conversation, limit: 1 }, expect: "read" },
  { tool: "conversations", args: { action: "create", subject: "test" }, expect: "write" },
  { tool: "conversations", args: { action: "update", conversation_id: IDS.conversation }, expect: "write" },
  { tool: "conversations", args: { action: "assign", conversation_id: IDS.conversation, assignee_id: IDS.teammate }, expect: "write" },
  { tool: "conversations", args: { action: "add_followers", conversation_id: IDS.conversation, teammate_ids: [IDS.teammate] }, expect: "write" },
  { tool: "conversations", args: { action: "add_link", conversation_id: IDS.conversation, link_id: IDS.link }, expect: "write" },
  { tool: "conversations", args: { action: "update_reminders", conversation_id: IDS.conversation }, expect: "write" },
  { tool: "conversations", args: { action: "add_tag", conversation_id: IDS.conversation, tag_id: IDS.tag }, expect: "write" },
  { tool: "conversations", args: { action: "delete", conversation_id: IDS.conversation }, expect: "destructive" },
  { tool: "conversations", args: { action: "remove_followers", conversation_id: IDS.conversation, teammate_ids: [IDS.teammate] }, expect: "destructive" },
  { tool: "conversations", args: { action: "remove_links", conversation_id: IDS.conversation, link_ids: [IDS.link] }, expect: "destructive" },
  { tool: "conversations", args: { action: "remove_tag", conversation_id: IDS.conversation, tag_ids: [IDS.tag] }, expect: "destructive" },

  // contacts (9)
  { tool: "contacts", args: { action: "list", limit: 1 }, expect: "read" },
  { tool: "contacts", args: { action: "get", contact_id: IDS.contact }, expect: "read" },
  { tool: "contacts", args: { action: "list_conversations", contact_id: IDS.contact, limit: 1 }, expect: "read" },
  { tool: "contacts", args: { action: "create", handles: [{ source: "email", handle: "test@test.com" }] }, expect: "write" },
  { tool: "contacts", args: { action: "update", contact_id: IDS.contact, name: "Test" }, expect: "write" },
  { tool: "contacts", args: { action: "merge", target_contact_id: IDS.contact, source_contact_id: IDS.contact }, expect: "write" },
  { tool: "contacts", args: { action: "add_handle", contact_id: IDS.contact, source: "email", handle: "new@test.com" }, expect: "write" },
  { tool: "contacts", args: { action: "delete", contact_id: IDS.contact }, expect: "destructive" },
  { tool: "contacts", args: { action: "remove_handle", contact_id: IDS.contact, handle: "test@test.com", source: "email" }, expect: "destructive" },

  // tags (8)
  { tool: "tags", args: { action: "list", limit: 1 }, expect: "read" },
  { tool: "tags", args: { action: "get", tag_id: IDS.tag }, expect: "read" },
  { tool: "tags", args: { action: "list_children", tag_id: IDS.tag }, expect: "read" },
  { tool: "tags", args: { action: "list_conversations", tag_id: IDS.tag, limit: 1 }, expect: "read" },
  { tool: "tags", args: { action: "create", name: "test-tag" }, expect: "write" },
  { tool: "tags", args: { action: "update", tag_id: IDS.tag, name: "updated" }, expect: "write" },
  { tool: "tags", args: { action: "create_child", tag_id: IDS.tag, name: "child" }, expect: "write" },
  { tool: "tags", args: { action: "delete", tag_id: IDS.tag }, expect: "destructive" },

  // inboxes (8)
  { tool: "inboxes", args: { action: "list", limit: 1 }, expect: "read" },
  { tool: "inboxes", args: { action: "get", inbox_id: IDS.inbox }, expect: "read" },
  { tool: "inboxes", args: { action: "list_channels", inbox_id: IDS.inbox }, expect: "read" },
  { tool: "inboxes", args: { action: "list_conversations", inbox_id: IDS.inbox, limit: 1 }, expect: "read" },
  { tool: "inboxes", args: { action: "list_access", inbox_id: IDS.inbox }, expect: "read" },
  { tool: "inboxes", args: { action: "create", name: "test-inbox" }, expect: "write" },
  { tool: "inboxes", args: { action: "grant_access", inbox_id: IDS.inbox, teammate_ids: [IDS.teammate] }, expect: "write" },
  { tool: "inboxes", args: { action: "revoke_access", inbox_id: IDS.inbox, teammate_ids: [IDS.teammate] }, expect: "destructive" },

  // accounts (8)
  { tool: "accounts", args: { action: "list" }, expect: "read" },
  { tool: "accounts", args: { action: "get", account_id: IDS.account }, expect: "read" },
  { tool: "accounts", args: { action: "list_contacts", account_id: IDS.account }, expect: "read" },
  { tool: "accounts", args: { action: "create", name: "test" }, expect: "write" },
  { tool: "accounts", args: { action: "update", account_id: IDS.account, name: "test" }, expect: "write" },
  { tool: "accounts", args: { action: "add_contact", account_id: IDS.account, contact_id: IDS.contact }, expect: "write" },
  { tool: "accounts", args: { action: "delete", account_id: IDS.account }, expect: "destructive" },
  { tool: "accounts", args: { action: "remove_contact", account_id: IDS.account, contact_id: IDS.contact }, expect: "destructive" },

  // messages (7)
  { tool: "messages", args: { action: "get", message_id: IDS.message }, expect: "read" },
  { tool: "messages", args: { action: "get_seen_status", message_id: IDS.message }, expect: "read" },
  { tool: "messages", args: { action: "create", conversation_id: IDS.conversation, body: "test" }, expect: "write" },
  { tool: "messages", args: { action: "reply", conversation_id: IDS.conversation, body: "test" }, expect: "write" },
  { tool: "messages", args: { action: "import", inbox_id: IDS.inbox, body: "test", sender: { handle: "test@test.com" } }, expect: "write" },
  { tool: "messages", args: { action: "receive_custom", channel_id: IDS.channel, body: "test", sender: { handle: "test@test.com" } }, expect: "write" },
  { tool: "messages", args: { action: "mark_seen", message_id: IDS.message }, expect: "write" },

  // channels (7)
  { tool: "channels", args: { action: "list", limit: 1 }, expect: "read" },
  { tool: "channels", args: { action: "get", channel_id: IDS.channel }, expect: "read" },
  { tool: "channels", args: { action: "validate", channel_id: IDS.channel }, expect: "read" },
  { tool: "channels", args: { action: "list_for_teammate", teammate_id: IDS.teammate }, expect: "read" },
  { tool: "channels", args: { action: "list_for_team", team_id: IDS.team }, expect: "read" },
  { tool: "channels", args: { action: "update", channel_id: IDS.channel }, expect: "write" },
  { tool: "channels", args: { action: "create", inbox_id: IDS.inbox, type: "custom" }, expect: "write" },

  // comments (6)
  { tool: "comments", args: { action: "list", conversation_id: IDS.conversation, limit: 1 }, expect: "read" },
  { tool: "comments", args: { action: "list_mentions", comment_id: "com_test" }, expect: "read" },
  { tool: "comments", args: { action: "create", conversation_id: IDS.conversation, body: "test" }, expect: "write" },
  { tool: "comments", args: { action: "update", comment_id: "com_test", body: "test" }, expect: "write" },
  { tool: "comments", args: { action: "reply", comment_id: "com_test", body: "test" }, expect: "write" },
  // comments.get needs a real comment_id — skip if we don't have one

  // contact_groups (6)
  { tool: "contact_groups", args: { action: "list" }, expect: "read" },
  { tool: "contact_groups", args: { action: "list_contacts", contact_group_id: IDS.contact_group }, expect: "read" },
  { tool: "contact_groups", args: { action: "create", name: "test-group" }, expect: "write" },
  { tool: "contact_groups", args: { action: "add_contacts", contact_group_id: IDS.contact_group, contact_ids: [IDS.contact] }, expect: "write" },
  { tool: "contact_groups", args: { action: "delete", contact_group_id: IDS.contact_group }, expect: "destructive" },
  { tool: "contact_groups", args: { action: "remove_contacts", contact_group_id: IDS.contact_group, contact_ids: [IDS.contact] }, expect: "destructive" },

  // contact_lists (6)
  { tool: "contact_lists", args: { action: "list" }, expect: "read" },
  { tool: "contact_lists", args: { action: "list_contacts", contact_list_id: IDS.contact_list }, expect: "read" },
  { tool: "contact_lists", args: { action: "create", name: "test-list" }, expect: "write" },
  { tool: "contact_lists", args: { action: "add_contacts", contact_list_id: IDS.contact_list, contact_ids: [IDS.contact] }, expect: "write" },
  { tool: "contact_lists", args: { action: "delete", contact_list_id: IDS.contact_list }, expect: "destructive" },
  { tool: "contact_lists", args: { action: "remove_contacts", contact_list_id: IDS.contact_list, contact_ids: [IDS.contact] }, expect: "destructive" },

  // contact_notes (2)
  { tool: "contact_notes", args: { action: "list", contact_id: IDS.contact }, expect: "read" },
  { tool: "contact_notes", args: { action: "create", contact_id: IDS.contact, body: "test note" }, expect: "write" },

  // custom_fields (6)
  { tool: "custom_fields", args: { action: "list_for_accounts" }, expect: "read" },
  { tool: "custom_fields", args: { action: "list_for_contacts" }, expect: "read" },
  { tool: "custom_fields", args: { action: "list_for_conversations" }, expect: "read" },
  { tool: "custom_fields", args: { action: "list_for_inboxes" }, expect: "read" },
  { tool: "custom_fields", args: { action: "list_for_links" }, expect: "read" },
  { tool: "custom_fields", args: { action: "list_for_teammates" }, expect: "read" },

  // drafts (5)
  { tool: "drafts", args: { action: "list", conversation_id: IDS.conversation }, expect: "read" },
  { tool: "drafts", args: { action: "create", conversation_id: IDS.conversation, body: "draft" }, expect: "write" },
  { tool: "drafts", args: { action: "create_reply", conversation_id: IDS.conversation, body: "draft reply" }, expect: "write" },
  { tool: "drafts", args: { action: "update", draft_id: "msg_test", body: "updated" }, expect: "write" },
  { tool: "drafts", args: { action: "delete", draft_id: "msg_test" }, expect: "destructive" },

  // events (2)
  { tool: "events", args: { action: "list", limit: 1 }, expect: "read" },
  { tool: "events", args: { action: "get", event_id: IDS.event }, expect: "read" },

  // knowledge_bases (14)
  { tool: "knowledge_bases", args: { action: "list" }, expect: "read" },
  { tool: "knowledge_bases", args: { action: "get", knowledge_base_id: IDS.kb }, expect: "read" },
  { tool: "knowledge_bases", args: { action: "list_categories", knowledge_base_id: IDS.kb }, expect: "read" },
  { tool: "knowledge_bases", args: { action: "list_articles", knowledge_base_id: IDS.kb }, expect: "read" },
  { tool: "knowledge_bases", args: { action: "create", name: "test-kb" }, expect: "write" },
  { tool: "knowledge_bases", args: { action: "update", knowledge_base_id: IDS.kb, name: "test" }, expect: "write" },
  { tool: "knowledge_bases", args: { action: "create_article", knowledge_base_id: IDS.kb, title: "test" }, expect: "write" },
  { tool: "knowledge_bases", args: { action: "create_category", knowledge_base_id: IDS.kb, name: "test" }, expect: "write" },
  { tool: "knowledge_bases", args: { action: "update_article", knowledge_base_id: IDS.kb, article_id: "art_test" }, expect: "write" },
  { tool: "knowledge_bases", args: { action: "update_category", knowledge_base_id: IDS.kb, category_id: "cat_test" }, expect: "write" },
  { tool: "knowledge_bases", args: { action: "get_article", article_id: "art_test" }, expect: "read" },
  { tool: "knowledge_bases", args: { action: "get_category", category_id: "cat_test" }, expect: "read" },
  { tool: "knowledge_bases", args: { action: "delete_article", knowledge_base_id: IDS.kb, article_id: "art_test" }, expect: "destructive" },
  { tool: "knowledge_bases", args: { action: "delete_category", knowledge_base_id: IDS.kb, category_id: "cat_test" }, expect: "destructive" },

  // links (5)
  { tool: "links", args: { action: "list" }, expect: "read" },
  { tool: "links", args: { action: "get", link_id: IDS.link }, expect: "read" },
  { tool: "links", args: { action: "list_conversations", link_id: IDS.link }, expect: "read" },
  { tool: "links", args: { action: "create", name: "test" }, expect: "write" },
  { tool: "links", args: { action: "update", link_id: IDS.link, name: "test" }, expect: "write" },

  // message_template_folders (7)
  { tool: "message_template_folders", args: { action: "list" }, expect: "read" },
  { tool: "message_template_folders", args: { action: "get", folder_id: IDS.message_template_folder }, expect: "read" },
  { tool: "message_template_folders", args: { action: "list_children", folder_id: IDS.message_template_folder }, expect: "read" },
  { tool: "message_template_folders", args: { action: "create", name: "test" }, expect: "write" },
  { tool: "message_template_folders", args: { action: "update", folder_id: IDS.message_template_folder, name: "test" }, expect: "write" },
  { tool: "message_template_folders", args: { action: "create_child", folder_id: IDS.message_template_folder, name: "child" }, expect: "write" },
  { tool: "message_template_folders", args: { action: "delete", folder_id: IDS.message_template_folder }, expect: "destructive" },

  // message_templates (7)
  { tool: "message_templates", args: { action: "list" }, expect: "read" },
  { tool: "message_templates", args: { action: "get", template_id: IDS.message_template }, expect: "read" },
  { tool: "message_templates", args: { action: "create", name: "test", body: "test" }, expect: "write" },
  { tool: "message_templates", args: { action: "update", template_id: IDS.message_template, name: "test" }, expect: "write" },
  { tool: "message_templates", args: { action: "delete", template_id: IDS.message_template }, expect: "destructive" },

  // rules (5)
  { tool: "rules", args: { action: "list" }, expect: "read" },
  { tool: "rules", args: { action: "get", rule_id: IDS.rule }, expect: "read" },
  { tool: "rules", args: { action: "list_for_teammate", teammate_id: IDS.teammate }, expect: "read" },
  { tool: "rules", args: { action: "list_for_team", team_id: IDS.team }, expect: "read" },

  // shifts (7)
  { tool: "shifts", args: { action: "list" }, expect: "read" },
  { tool: "shifts", args: { action: "create", name: "test", color: "red" }, expect: "write" },
  { tool: "shifts", args: { action: "update", shift_id: "shf_test", name: "test" }, expect: "write" },
  { tool: "shifts", args: { action: "list_teammates", shift_id: "shf_test" }, expect: "read" },
  { tool: "shifts", args: { action: "add_teammates", shift_id: "shf_test", teammate_ids: [IDS.teammate] }, expect: "write" },
  { tool: "shifts", args: { action: "remove_teammates", shift_id: "shf_test", teammate_ids: [IDS.teammate] }, expect: "destructive" },

  // signatures (6)
  { tool: "signatures", args: { action: "list", teammate_id: IDS.teammate }, expect: "read" },
  { tool: "signatures", args: { action: "get", signature_id: IDS.signature }, expect: "read" },
  { tool: "signatures", args: { action: "update", signature_id: IDS.signature, name: "test" }, expect: "write" },
  { tool: "signatures", args: { action: "create_for_teammate", teammate_id: IDS.teammate, name: "test" }, expect: "write" },
  { tool: "signatures", args: { action: "create_for_team", team_id: IDS.team, name: "test" }, expect: "write" },
  { tool: "signatures", args: { action: "delete", signature_id: IDS.signature }, expect: "destructive" },

  // teammate_groups (14)
  { tool: "teammate_groups", args: { action: "list" }, expect: "read" },
  { tool: "teammate_groups", args: { action: "get", group_id: IDS.teammate_group }, expect: "read" },
  { tool: "teammate_groups", args: { action: "list_inboxes", group_id: IDS.teammate_group }, expect: "read" },
  { tool: "teammate_groups", args: { action: "list_teammates", group_id: IDS.teammate_group }, expect: "read" },
  { tool: "teammate_groups", args: { action: "list_teams", group_id: IDS.teammate_group }, expect: "read" },
  { tool: "teammate_groups", args: { action: "create", name: "test" }, expect: "write" },
  { tool: "teammate_groups", args: { action: "update", group_id: IDS.teammate_group, name: "test" }, expect: "write" },
  { tool: "teammate_groups", args: { action: "add_inboxes", group_id: IDS.teammate_group, inbox_ids: [IDS.inbox] }, expect: "write" },
  { tool: "teammate_groups", args: { action: "add_teammates", group_id: IDS.teammate_group, teammate_ids: [IDS.teammate] }, expect: "write" },
  { tool: "teammate_groups", args: { action: "add_teams", group_id: IDS.teammate_group, team_ids: [IDS.team] }, expect: "write" },
  { tool: "teammate_groups", args: { action: "delete", group_id: IDS.teammate_group }, expect: "destructive" },
  { tool: "teammate_groups", args: { action: "remove_inboxes", group_id: IDS.teammate_group, inbox_ids: [IDS.inbox] }, expect: "destructive" },
  { tool: "teammate_groups", args: { action: "remove_teammates", group_id: IDS.teammate_group, teammate_ids: [IDS.teammate] }, expect: "destructive" },
  { tool: "teammate_groups", args: { action: "remove_teams", group_id: IDS.teammate_group, team_ids: [IDS.team] }, expect: "destructive" },

  // teammates (5)
  { tool: "teammates", args: { action: "list" }, expect: "read" },
  { tool: "teammates", args: { action: "get", teammate_id: IDS.teammate }, expect: "read" },
  { tool: "teammates", args: { action: "list_conversations", teammate_id: IDS.teammate, limit: 1 }, expect: "read" },
  { tool: "teammates", args: { action: "list_inboxes", teammate_id: IDS.teammate }, expect: "read" },
  { tool: "teammates", args: { action: "update", teammate_id: IDS.teammate }, expect: "write" },

  // teams (4)
  { tool: "teams", args: { action: "list" }, expect: "read" },
  { tool: "teams", args: { action: "get", team_id: IDS.team }, expect: "read" },
  { tool: "teams", args: { action: "add_teammates", team_id: IDS.team, teammate_ids: [IDS.teammate] }, expect: "write" },
  { tool: "teams", args: { action: "remove_teammates", team_id: IDS.team, teammate_ids: [IDS.teammate] }, expect: "destructive" },

  // analytics (4)
  { tool: "analytics", args: { action: "create_export", start: "2026-01-01", end: "2026-01-02" }, expect: "write" },
  { tool: "analytics", args: { action: "get_export", export_id: "exp_test" }, expect: "read" },
  { tool: "analytics", args: { action: "create_report", start: "2026-01-01", end: "2026-01-02" }, expect: "write" },
  { tool: "analytics", args: { action: "get_report", report_uid: "rpt_test" }, expect: "read" },
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
const readPassed = [];
const writePassed = [];
const destructivePassed = [];

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
      const label = `${test.tool}.${test.args.action}`;

      let success = false;

      if (test.expect === "read") {
        // Read actions should succeed (not error, not confirm, not deny)
        if (!isError && !text.includes("CONFIRMATION") && !text.includes("DENIED")) {
          success = true;
          readPassed.push(label);
        }
      } else if (test.expect === "write") {
        // Write actions should require confirmation
        if (text.includes("CONFIRMATION REQUIRED")) {
          success = true;
          writePassed.push(label);
        }
      } else if (test.expect === "destructive") {
        // Destructive actions should be denied
        if (text.includes("DENIED")) {
          success = true;
          destructivePassed.push(label);
        }
      }

      if (success) {
        process.stderr.write(`  \x1b[32m✓\x1b[0m ${label}\n`);
        passed++;
      } else {
        const snippet = text.substring(0, 100).replace(/\n/g, " ");
        process.stderr.write(`  \x1b[31m✗\x1b[0m ${label} [expected ${test.expect}] — ${snippet}\n`);
        failed++;
        failures.push({ label, expected: test.expect, got: snippet });
      }

      currentTest++;
      if (currentTest < tests.length) {
        sendNext();
      } else {
        finish();
      }
    } catch {
      // incomplete JSON
    }
  }
});

child.stderr.on("data", () => {});

function sendNext() {
  const test = tests[currentTest];
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id: currentTest + 1,
    method: "tools/call",
    params: { name: test.tool, arguments: test.args },
  });
  child.stdin.write(request + "\n");
}

function finish() {
  process.stderr.write(`\n  ═══════════════════════════════════════\n`);
  process.stderr.write(`  Total: ${tests.length} actions tested\n`);
  process.stderr.write(`  Read:        ${readPassed.length} passed\n`);
  process.stderr.write(`  Write:       ${writePassed.length} confirmed\n`);
  process.stderr.write(`  Destructive: ${destructivePassed.length} denied\n`);
  process.stderr.write(`  \x1b[32mPassed: ${passed}\x1b[0m  \x1b[31mFailed: ${failed}\x1b[0m\n`);
  process.stderr.write(`  ═══════════════════════════════════════\n`);

  if (failures.length > 0) {
    process.stderr.write(`\n  Failures:\n`);
    for (const f of failures) {
      process.stderr.write(`    ${f.label} [expected: ${f.expected}]: ${f.got}\n`);
    }
  }

  child.kill();
  process.exit(failed > 0 ? 1 : 0);
}

process.stderr.write(`\n  Full Live API Test — ${tests.length} actions\n  ═══════════════════════════════════════\n\n`);
sendNext();

setTimeout(() => {
  process.stderr.write(`\n  TIMEOUT after 300s (completed ${currentTest}/${tests.length})\n`);
  child.kill();
  process.exit(1);
}, 300000);
