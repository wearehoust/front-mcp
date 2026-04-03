
import { z } from "zod";
import type { ConversationsService } from "../services/conversations.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import {
  formatSuccess,
  formatConfirmation,
  formatError,
  summarizeList,
  summarizeGet,
  summarizeAction,
} from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";
import { validateRequiredFields } from "./validate.js";

const TOOL_NAME = "conversations";
const DESCRIPTION =
  "Manage Front conversations — list, search, get details, create, update, delete, assign, manage followers, tags, links, messages, reminders, inboxes, and events.";

export function registerConversationsTool(
  server: unknown,
  service: ConversationsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum([
        "list", "get", "search", "create", "update", "delete",
        "assign", "list_events", "list_followers", "add_followers",
        "remove_followers", "list_inboxes", "add_link", "remove_links",
        "list_messages", "update_reminders", "add_tag", "remove_tag",
      ]).describe("The action to perform"),
      conversation_id: z.string().optional().describe("Conversation ID"),
      status: z.string().optional(),
      query: z.string().optional(),
      subject: z.string().optional(),
      comment: z.string().optional(),
      assignee_id: z.string().optional(),
      teammate_ids: z.array(z.string()).optional(),
      link_id: z.string().optional(),
      link_ids: z.array(z.string()).optional(),
      tag_id: z.string().optional(),
      tag_ids: z.array(z.string()).optional(),
      inbox_id: z.string().optional(),
      page_token: z.string().optional(),
      limit: z.number().optional(),
      auto_paginate: z.boolean().optional(),
      confirm: z.boolean().optional(),
    },
    { readOnlyHint: false, destructiveHint: true },
    async (params) => {
      try {
        const action = params["action"] as string;

        // Validate required fields before hitting the API
        const validationError = validateRequiredFields(params, [
          { field: "conversation_id", type: "string", requiredFor: ["get", "update", "delete", "assign", "list_events", "list_followers", "add_followers", "remove_followers", "list_inboxes", "add_link", "remove_links", "list_messages", "update_reminders", "add_tag", "remove_tag"] },
          { field: "assignee_id", type: "string", requiredFor: ["assign"] },
          { field: "tag_id", type: "string", requiredFor: ["add_tag"] },
          { field: "link_id", type: "string", requiredFor: ["add_link"] },
          { field: "query", type: "string", requiredFor: ["search"] },
        ]);
        if (validationError !== null) return validationError;

        const evaluation = policy.evaluate(TOOL_NAME, action, params);
        if (evaluation.decision === "deny") {
          return formatError(evaluation.message ?? "Action denied by policy");
        }
        if (evaluation.decision === "confirm") {
          return formatConfirmation(evaluation.message ?? "Confirmation required");
        }

        const result = await service.execute(params);
        const sanitized = sanitize(result, sanitizationConfig);

        if (action === "list" || action === "search" || action.startsWith("list_")) {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("conversations", count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("conversation", (params["conversation_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("conversation", action, params["conversation_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
