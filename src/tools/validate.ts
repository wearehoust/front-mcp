import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { formatError } from "./format.js";

interface FieldRequirement {
  field: string;
  type: "string" | "array" | "object";
  requiredFor: string[];
}

export function validateRequiredFields(
  params: Record<string, unknown>,
  requirements: FieldRequirement[],
): CallToolResult | null {
  const action = params["action"] as string | undefined;
  if (action === undefined) {
    return formatError(
      "Missing required field: action. Specify which action to perform.",
    );
  }

  const missing: string[] = [];
  for (const req of requirements) {
    if (!req.requiredFor.includes(action)) {
      continue;
    }
    const value = params[req.field];
    if (value === undefined || value === null) {
      missing.push(req.field);
      continue;
    }
    if (req.type === "string" && (typeof value !== "string" || value.length === 0)) {
      missing.push(`${req.field} (must be a non-empty string)`);
    }
    if (req.type === "array" && !Array.isArray(value)) {
      missing.push(`${req.field} (must be an array)`);
    }
  }

  if (missing.length > 0) {
    return formatError(
      `Missing required field${missing.length > 1 ? "s" : ""} for ${action}: ${missing.join(", ")}`,
    );
  }

  return null;
}
