import { z } from "zod";
import type { ContactNotesService } from "../services/contact_notes.service.js";
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

const TOOL_NAME = "contact_notes";
const DESCRIPTION =
  "Manage Front contact notes — list or create notes on a contact.";

export function registerContactNotesTool(
  server: unknown,
  service: ContactNotesService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum(["list", "create"]).describe("The action to perform"),
      contact_id: z.string().optional(),
      author_id: z.string().optional(),
      body: z.string().optional(),
      page_token: z.string().optional(),
      limit: z.number().optional(),
      auto_paginate: z.boolean().optional(),
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

        if (action === "list") {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("contact_notes", count, resultObj.next_page_token));
        }
        return formatSuccess(sanitized, summarizeAction("contact_note", action, params["contact_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
