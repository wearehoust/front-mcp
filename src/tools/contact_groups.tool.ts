import { z } from "zod";
import type { ContactGroupsService } from "../services/contact_groups.service.js";
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

const TOOL_NAME = "contact_groups";
const DESCRIPTION =
  "Manage Front contact groups — list, create, delete groups, and manage group membership by adding or removing contacts.";

export function registerContactGroupsTool(
  server: unknown,
  service: ContactGroupsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "create", "delete", "list_contacts", "add_contacts", "remove_contacts"]).describe("The action to perform"),
      contact_group_id: z.string().optional(),
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
          const resourceName = action === "list_contacts" ? "contacts" : "contact_groups";
          return formatSuccess(sanitized, summarizeList(resourceName, count, resultObj.next_page_token));
        }
        return formatSuccess(sanitized, summarizeAction("contact_group", action, params["contact_group_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
