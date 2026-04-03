import { z } from "zod";
import type { CustomFieldsService } from "../services/custom_fields.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import {
  formatSuccess,
  formatConfirmation,
  formatError,
  summarizeList,
} from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";

const TOOL_NAME = "custom_fields";
const DESCRIPTION =
  "Query Front custom field definitions — list custom fields for accounts, contacts, conversations, inboxes, links, or teammates.";

export function registerCustomFieldsTool(
  server: unknown,
  service: CustomFieldsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list_for_accounts", "list_for_contacts", "list_for_conversations", "list_for_inboxes", "list_for_links", "list_for_teammates"]).describe("The action to perform"),
      page_token: z.string().optional(),
      limit: z.number().optional(),
      auto_paginate: z.boolean().optional(),
    },
    { readOnlyHint: true, destructiveHint: false },
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

        const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
        const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
        return formatSuccess(sanitized, summarizeList("custom_fields", count, resultObj.next_page_token));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
