import { z } from "zod";
import type { EventsService } from "../services/events.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import {
  formatSuccess,
  formatConfirmation,
  formatError,
  summarizeList,
  summarizeGet,
} from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";

const TOOL_NAME = "events";
const DESCRIPTION =
  "Query Front events — list recent events or get a specific event by ID.";

export function registerEventsTool(
  server: unknown,
  service: EventsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "get"]).describe("The action to perform"),
      event_id: z.string().optional(),
      types: z.array(z.string()).optional(),
      before: z.number().optional(),
      after: z.number().optional(),
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

        if (action === "list") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("events", count, resultObj.next_page_token));
        }
        return formatSuccess(sanitized, summarizeGet("event", (params["event_id"] as string | undefined) ?? "unknown"));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
