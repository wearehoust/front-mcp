
import { z } from "zod";
import type { ContactsService } from "../services/contacts.service.js";
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

const TOOL_NAME = "contacts";
const DESCRIPTION =
  "Manage Front contacts — list, get, create, update, delete, merge contacts, manage handles, and list conversations.";

export function registerContactsTool(
  server: unknown,
  service: ContactsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "get", "create", "update", "delete", "merge", "list_conversations", "add_handle", "remove_handle"]).describe("The action to perform"),
      contact_id: z.string().optional(),
      handles: z.array(z.object({ source: z.string(), handle: z.string() })).optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      target_contact_id: z.string().optional(),
      source_contact_id: z.string().optional(),
      handle_id: z.string().optional(),
      source: z.string().optional(),
      handle: z.string().optional(),
      sort_by: z.string().optional(),
      sort_order: z.enum(["asc", "desc"]).optional(),
      page_token: z.string().optional(),
      limit: z.number().optional(),
      auto_paginate: z.boolean().optional(),
      confirm: z.boolean().optional(),
    },
    { readOnlyHint: false, destructiveHint: true },
    async (params) => {
      try {
        const action = params["action"] as string;
        const evaluation = policy.evaluate(TOOL_NAME, action, params);
        if (evaluation.decision === "deny") {
          return formatError(evaluation.message ?? "Action denied by policy");
        }
        if (evaluation.decision === "confirm") {
          return formatConfirmation(evaluation.message ?? "Confirmation required");
        }

        const result = await service.execute(params);
        const sanitized = sanitize(result, sanitizationConfig);

        if (action === "list" || action === "list_conversations") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("contacts", count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("contact", (params["contact_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("contact", action, params["contact_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
