import { z } from "zod";
import type { RulesService } from "../services/rules.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import {
  formatSuccess,
  formatError,
  summarizeList,
  summarizeGet,
} from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";

const TOOL_NAME = "rules";
const DESCRIPTION =
  "Manage Front rules — list all rules, get a specific rule, or list rules for a specific inbox, teammate, or team.";

export function registerRulesTool(
  server: unknown,
  service: RulesService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "list_for_inbox", "get", "list_for_teammate", "list_for_team"]).describe("The action to perform"),
      rule_id: z.string().optional(),
      inbox_id: z.string().optional(),
      teammate_id: z.string().optional(),
      team_id: z.string().optional(),
    },
    { readOnlyHint: true, destructiveHint: false },
    async (params) => {
      try {
        const action = params["action"] as string;
        const evaluation = policy.evaluate(TOOL_NAME, action, params);
        if (evaluation.decision === "deny") {
          return formatError(evaluation.message ?? "Action denied by policy");
        }

        const result = await service.execute(params);
        const sanitized = sanitize(result, sanitizationConfig);

        const listActions = ["list", "list_for_inbox", "list_for_teammate", "list_for_team"];
        if (listActions.includes(action)) {
          const resultObj = sanitized as { results?: unknown[] };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("rules", count, undefined));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("rule", (params["rule_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, `${action} rules completed`);
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
