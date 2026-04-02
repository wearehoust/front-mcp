import { z } from "zod";
import type { TokenIdentityService } from "../services/token-identity.service.js";
import type { PolicyEngine } from "../policy/engine.js";
import { sanitize, type SanitizationConfig } from "../utils/sanitize.js";
import { formatSuccess, formatError } from "./format.js";
import { mapError } from "./error-mapper.js";
import { registerTool } from "./register.js";

const TOOL_NAME = "token_identity";
const DESCRIPTION = "Get information about the authenticated user/token — returns identity details for the current API token or OAuth session.";

export function registerTokenIdentityTool(
  server: unknown,
  service: TokenIdentityService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["get"]).describe("The action to perform"),
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
        return formatSuccess(sanitized, "Retrieved token identity");
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
