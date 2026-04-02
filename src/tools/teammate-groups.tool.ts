import { z } from "zod";
import type { TeammateGroupsService } from "../services/teammate-groups.service.js";
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

const TOOL_NAME = "teammate_groups";
const DESCRIPTION =
  "Manage Front teammate groups — list, get, create, update, delete groups, and manage group inboxes, teammates, and teams.";

export function registerTeammateGroupsTool(
  server: unknown,
  service: TeammateGroupsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum([
        "list", "get", "create", "update", "delete",
        "list_inboxes", "add_inboxes", "remove_inboxes",
        "list_teammates", "add_teammates", "remove_teammates",
        "list_teams", "add_teams", "remove_teams",
      ]).describe("The action to perform"),
      group_id: z.string().optional(),
      name: z.string().optional(),
      inbox_ids: z.array(z.string()).optional(),
      teammate_ids: z.array(z.string()).optional(),
      team_ids: z.array(z.string()).optional(),
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

        if (action === "list" || action.startsWith("list_")) {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("teammate_groups", count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("teammate_group", (params["group_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("teammate_group", action, params["group_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
