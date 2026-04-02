import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { FrontApiError, NetworkError } from "../client/retry.js";
import { formatError } from "./format.js";

export function mapError(error: unknown): CallToolResult {
  if (error instanceof FrontApiError) {
    return mapApiError(error);
  }

  if (error instanceof NetworkError) {
    return formatError(
      `Network error: ${error.message}. Check your connection and try again.`,
    );
  }

  if (error instanceof Error) {
    return formatError(`Unexpected error: ${error.message}`);
  }

  return formatError("An unknown error occurred.");
}

function mapApiError(error: FrontApiError): CallToolResult {
  const status = error.status;
  const message = error.frontMessage;

  switch (status) {
    case 400:
      return formatError(
        `Invalid request: ${message}. Check your parameters and try again.`,
      );
    case 401:
      return formatError(
        `Authentication failed: ${message}. Your token may be expired — try re-authenticating.`,
      );
    case 403:
      return formatError(
        `Insufficient permissions: ${message}. Check your OAuth scopes or API token permissions.`,
      );
    case 404:
      return formatError(
        `Not found: ${message}. The resource may have been deleted or the ID is incorrect.`,
      );
    case 409:
      return formatError(`Conflict: ${message}. The resource may have been modified concurrently.`);
    case 429:
      return formatError(
        `Rate limit exceeded after retries: ${message}. Wait a moment and try again.`,
      );
    default:
      if (status >= 500) {
        return formatError(
          `Front API error (${status}): ${message}. This is a server-side issue — try again later.`,
        );
      }
      return formatError(`Front API error (${status}): ${message}`);
  }
}
