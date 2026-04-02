import { z } from "zod";
import type { ChannelsService } from "../services/channels.service.js";
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

const TOOL_NAME = "channels";
const DESCRIPTION =
  "Manage Front channels — list, get, create, update, validate channels, and list channels for teammates or teams.";

export function registerChannelsTool(
  server: unknown,
  service: ChannelsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "get", "update", "validate", "create", "list_for_teammate", "list_for_team"]).describe("The action to perform"),
      channel_id: z.string().optional(),
      teammate_id: z.string().optional(),
      team_id: z.string().optional(),
      type: z.string().optional(),
      name: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
      inbox_id: z.string().optional(),
      confirm: z.boolean().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
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

        if (action === "list" || action === "list_for_teammate" || action === "list_for_team") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("channels", count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("channel", (params["channel_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("channel", action, params["channel_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
