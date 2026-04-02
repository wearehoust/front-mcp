import { z } from "zod";
import type { AnalyticsService } from "../services/analytics.service.js";
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

const TOOL_NAME = "analytics";
const DESCRIPTION =
  "Access Front analytics — create and retrieve data exports and reports.";

export function registerAnalyticsTool(
  server: unknown,
  service: AnalyticsService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["create_export", "get_export", "create_report", "get_report"]).describe("The action to perform"),
      export_id: z.string().optional(),
      report_uid: z.string().optional(),
      start: z.number().optional(),
      end: z.number().optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
      columns: z.array(z.string()).optional(),
      metrics: z.array(z.string()).optional(),
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

        if (action === "get_export") {
          return formatSuccess(sanitized, summarizeGet("export", (params["export_id"] as string | undefined) ?? "unknown"));
        }
        if (action === "get_report") {
          return formatSuccess(sanitized, summarizeGet("report", (params["report_uid"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("analytics", action));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
