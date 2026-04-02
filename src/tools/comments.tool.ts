import { z } from "zod";
import type { CommentsService } from "../services/comments.service.js";
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

const TOOL_NAME = "comments";
const DESCRIPTION =
  "Manage Front comments — list, get, create, update comments on conversations, list mentions, and reply to comments.";

export function registerCommentsTool(
  server: unknown,
  service: CommentsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "get", "create", "update", "list_mentions", "reply"]).describe("The action to perform"),
      comment_id: z.string().optional(),
      conversation_id: z.string().optional(),
      body: z.string().optional(),
      author_id: z.string().optional(),
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

        if (action === "list" || action === "list_mentions") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          const resourceName = action === "list_mentions" ? "mentions" : "comments";
          return formatSuccess(sanitized, summarizeList(resourceName, count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("comment", (params["comment_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("comment", action, params["comment_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
