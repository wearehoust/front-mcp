import { z } from "zod";
import type { DraftsService } from "../services/drafts.service.js";
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

const TOOL_NAME = "drafts";
const DESCRIPTION =
  "Manage Front drafts — list, create, create reply drafts, update, and delete drafts within a conversation.";

export function registerDraftsTool(
  server: unknown,
  service: DraftsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "create", "create_reply", "update", "delete"]).describe("The action to perform"),
      conversation_id: z.string().optional(),
      draft_id: z.string().optional(),
      author_id: z.string().optional(),
      body: z.string().optional(),
      subject: z.string().optional(),
      to: z.array(z.string()).optional(),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      channel_id: z.string().optional(),
      mode: z.enum(["private", "shared"]).optional(),
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
          return formatSuccess(sanitized, summarizeList("drafts", count, resultObj.next_page_token));
        }
        const id = (params["draft_id"] ?? params["conversation_id"]) as string | undefined;
        return formatSuccess(sanitized, summarizeAction("draft", action, id));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
