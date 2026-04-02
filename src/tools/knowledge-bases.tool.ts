import { z } from "zod";
import type { KnowledgeBasesService } from "../services/knowledge-bases.service.js";
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

const TOOL_NAME = "knowledge_bases";
const DESCRIPTION =
  "Manage Front knowledge bases — list, get, create, update knowledge bases, manage categories and articles within them.";

export function registerKnowledgeBasesTool(
  server: unknown,
  service: KnowledgeBasesService,
  policy: PolicyEngine,
  sanitizationConfig: SanitizationConfig,
): void {
  registerTool(
    server,
    TOOL_NAME,
    DESCRIPTION,
    {
      action: z.enum([
        "list", "get", "create", "update",
        "list_categories", "list_articles",
        "get_article", "create_article", "update_article", "delete_article",
        "get_category", "create_category", "update_category", "delete_category",
      ]).describe("The action to perform"),
      knowledge_base_id: z.string().optional(),
      article_id: z.string().optional(),
      category_id: z.string().optional(),
      name: z.string().optional(),
      locale: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().optional(),
      author_id: z.string().optional(),
      status: z.enum(["draft", "published"]).optional(),
      description: z.string().optional(),
      parent_category_id: z.string().optional(),
      page_token: z.string().optional(),
      limit: z.number().optional(),
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

        const listActions = ["list", "list_categories", "list_articles"];
        if (listActions.includes(action)) {
          const resultObj = sanitized as { results?: unknown[]; next_page_token?: string };
          const count = Array.isArray(resultObj.results) ? resultObj.results.length : 0;
          return formatSuccess(sanitized, summarizeList("knowledge_bases", count, resultObj.next_page_token));
        }
        if (action === "get") {
          return formatSuccess(sanitized, summarizeGet("knowledge_base", (params["knowledge_base_id"] as string | undefined) ?? "unknown"));
        }
        if (action === "get_article") {
          return formatSuccess(sanitized, summarizeGet("article", (params["article_id"] as string | undefined) ?? "unknown"));
        }
        if (action === "get_category") {
          return formatSuccess(sanitized, summarizeGet("category", (params["category_id"] as string | undefined) ?? "unknown"));
        }
        return formatSuccess(sanitized, summarizeAction("knowledge_base", action, params["knowledge_base_id"] as string | undefined));
      } catch (error: unknown) {
        return mapError(error);
      }
    },
  );
}
