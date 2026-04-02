import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function formatSuccess(data: unknown, summary: string): CallToolResult {
  return {
    content: [
      {
        type: "text" as const,
        text: summary,
      },
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function formatError(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

export function formatConfirmation(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

export function summarizeList(
  resourceName: string,
  count: number,
  nextPageToken?: string,
): string {
  let summary = `Found ${count} ${resourceName}`;
  if (typeof nextPageToken === "string") {
    summary += ` (more available, use page_token: "${nextPageToken}")`;
  }
  return summary;
}

export function summarizeGet(resourceName: string, id: string): string {
  return `Retrieved ${resourceName} ${id}`;
}

export function summarizeAction(
  resourceName: string,
  action: string,
  id?: string,
): string {
  const target = typeof id === "string" ? ` ${id}` : "";
  return `${action} ${resourceName}${target} completed`;
}
