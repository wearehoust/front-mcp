import { describe, it, expect } from "vitest";
import {
  getActionTier,
  getAllActionTiers,
} from "../../../src/policy/default-policy.js";

describe("Default Policy", () => {
  it("classifies every action in every tool", () => {
    const allTiers = getAllActionTiers();
    const validTiers = new Set(["read", "write", "destructive"]);

    for (const [tool, actions] of Object.entries(allTiers)) {
      for (const [action, tier] of Object.entries(actions)) {
        expect(validTiers.has(tier)).toBe(true);
        // Also verify via getActionTier
        expect(getActionTier(tool, action)).toBe(tier);
      }
    }
  });

  it("has all 26 tools", () => {
    const allTiers = getAllActionTiers();
    const expectedTools = [
      "accounts", "analytics", "channels", "comments", "contact_groups",
      "contact_lists", "contact_notes", "contacts", "conversations",
      "custom_fields", "drafts", "events", "inboxes", "knowledge_bases",
      "links", "message_template_folders", "message_templates", "messages",
      "rules", "shifts", "signatures", "tags", "teammate_groups",
      "teammates", "teams", "token_identity",
    ];

    for (const tool of expectedTools) {
      expect(allTiers[tool]).toBeDefined();
    }
    expect(Object.keys(allTiers).length).toBe(26);
  });

  describe("read tier classification", () => {
    const readActions: [string, string][] = [
      ["conversations", "list"],
      ["conversations", "get"],
      ["conversations", "search"],
      ["conversations", "list_events"],
      ["conversations", "list_messages"],
      ["messages", "get"],
      ["messages", "get_seen_status"],
      ["contacts", "list"],
      ["contacts", "get"],
      ["tags", "list"],
      ["inboxes", "list"],
      ["events", "list"],
      ["events", "get"],
      ["rules", "list"],
      ["token_identity", "get"],
      ["custom_fields", "list_for_accounts"],
    ];

    for (const [tool, action] of readActions) {
      it(`classifies ${tool}.${action} as read`, () => {
        expect(getActionTier(tool, action)).toBe("read");
      });
    }
  });

  describe("write tier classification", () => {
    const writeActions: [string, string][] = [
      ["conversations", "create"],
      ["conversations", "update"],
      ["conversations", "assign"],
      ["conversations", "add_tag"],
      ["conversations", "add_followers"],
      ["messages", "create"],
      ["messages", "reply"],
      ["messages", "mark_seen"],
      ["contacts", "create"],
      ["contacts", "update"],
      ["contacts", "merge"],
      ["tags", "create"],
      ["tags", "update"],
      ["inboxes", "create"],
      ["drafts", "create"],
      ["shifts", "create"],
    ];

    for (const [tool, action] of writeActions) {
      it(`classifies ${tool}.${action} as write`, () => {
        expect(getActionTier(tool, action)).toBe("write");
      });
    }
  });

  describe("destructive tier classification", () => {
    const destructiveActions: [string, string][] = [
      ["conversations", "delete"],
      ["conversations", "remove_tag"],
      ["conversations", "remove_followers"],
      ["conversations", "remove_links"],
      ["contacts", "delete"],
      ["contacts", "remove_handle"],
      ["tags", "delete"],
      ["drafts", "delete"],
      ["accounts", "delete"],
      ["inboxes", "revoke_access"],
      ["knowledge_bases", "delete_article"],
      ["knowledge_bases", "delete_category"],
      ["shifts", "remove_teammates"],
      ["teams", "remove_teammates"],
    ];

    for (const [tool, action] of destructiveActions) {
      it(`classifies ${tool}.${action} as destructive`, () => {
        expect(getActionTier(tool, action)).toBe("destructive");
      });
    }
  });

  describe("safe defaults", () => {
    it("unknown tool defaults to write tier", () => {
      expect(getActionTier("unknown_tool", "some_action")).toBe("write");
    });

    it("unknown action defaults to write tier", () => {
      expect(getActionTier("conversations", "unknown_action")).toBe("write");
    });
  });
});
