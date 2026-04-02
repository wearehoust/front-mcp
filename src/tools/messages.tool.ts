
import { z } from "zod";
import type { MessagesService } from "../services/messages.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import {
  formatSuccess,
  formatConfirmation,
  formatError,
  summarizeGet,
  summarizeAction,
} from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";

const TOOL_NAME = "messages";
const DESCRIPTION =
  "Manage Front messages — get message details, create new messages, reply to conversations, import messages, handle custom channel messages, and manage seen status.";

export function registerMessagesTool(
  server: unknown,
  service: MessagesService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["get", "create", "reply", "import", "receive_custom", "get_seen_status", "mark_seen"]).describe("The action to perform"),
      message_id: z.string().optional(),
      conversation_id: z.string().optional(),
      inbox_id: z.string().optional(),
      channel_id: z.string().optional(),
      body: z.string().optional(),
      type: z.string().optional(),
      sender: z.object({ handle: z.string(), name: z.string().optional() }).optional(),
      options: z.record(z.unknown()).optional(),
      metadata: z.record(z.unknown()).optional(),
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

        if (action === "get" || action === "get_seen_status") {
          return formatSuccess(sanitized, summarizeGet("message", (params["message_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("message", action));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
