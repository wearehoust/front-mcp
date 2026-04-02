import { z } from "zod";
import type { ContactListsService } from "../services/contact_lists.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import {
  formatSuccess,
  formatConfirmation,
  formatError,
  summarizeList,
  summarizeAction,
} from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";

const TOOL_NAME = "contact_lists";
const DESCRIPTION =
  "Manage Front contact lists — list, create, delete contact lists, and list, add, or remove contacts from a list.";

export function registerContactListsTool(
  server: unknown,
  service: ContactListsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "create", "delete", "list_contacts", "add_contacts", "remove_contacts"]).describe("The action to perform"),
      contact_list_id: z.string().optional(),
      name: z.string().optional(),
      contact_ids: z.array(z.string()).optional(),
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

        if (action === "list" || action === "list_contacts") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          const resourceName = action === "list_contacts" ? "contacts" : "contact_lists";
          return formatSuccess(sanitized, summarizeList(resourceName, count, resultObj.next_page_token));
        }
        return formatSuccess(sanitized, summarizeAction("contact_list", action, params["contact_list_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
