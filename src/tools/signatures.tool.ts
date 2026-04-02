import { z } from "zod";
import type { SignaturesService } from "../services/signatures.service.js";
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

const TOOL_NAME = "signatures";
const DESCRIPTION =
  "Manage Front signatures — list, get, update, delete signatures, and create signatures for teammates or teams.";

export function registerSignaturesTool(
  server: unknown,
  service: SignaturesService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "get", "update", "delete", "create_for_teammate", "create_for_team"]).describe("The action to perform"),
      signature_id: z.string().optional(),
      teammate_id: z.string().optional(),
      team_id: z.string().optional(),
      name: z.string().optional(),
      body: z.string().optional(),
      sender_info: z.string().optional(),
      is_visible_for_all_teammate_channels: z.boolean().optional(),
      is_default: z.boolean().optional(),
      channel_ids: z.array(z.string()).optional(),
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

        if (action === "list") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("signatures", count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("signature", (params["signature_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("signature", action, params["signature_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
