import type { CallToolResult, ToolAnnotations, Tool } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "./zod-to-json-schema.js";
import type { z } from "zod";

export type ToolSchema = Record<string, z.ZodTypeAny>;
export type ToolHandler = (params: Record<string, unknown>) => Promise<CallToolResult>;

export interface ToolRegistration {
  name: string;
  description: string;
  schema: ToolSchema;
  annotations: ToolAnnotations;
  handler: ToolHandler;
}

const registeredTools: Map<string, ToolRegistration> = new Map();

export function registerTool(
  _server: unknown,
  name: string,
  description: string,
  schema: ToolSchema,
  annotations: ToolAnnotations,
  handler: ToolHandler,
): void {
  registeredTools.set(name, { name, description, schema, annotations, handler });
}

export function getRegisteredTools(): Map<string, ToolRegistration> {
  return registeredTools;
}

export function toolDefinitions(): Tool[] {
  const tools: Tool[] = [];
  for (const reg of registeredTools.values()) {
    const jsonSchema = zodToJsonSchema(reg.schema);
    tools.push({
      name: reg.name,
      description: reg.description,
      inputSchema: {
        type: "object" as const,
        properties: jsonSchema.properties,
        required: jsonSchema.required,
      },
      annotations: reg.annotations,
    });
  }
  return tools;
}

export async function callTool(
  name: string,
  params: Record<string, unknown>,
): Promise<CallToolResult> {
  const reg = registeredTools.get(name);
  if (reg === undefined) {
    const available = Array.from(registeredTools.keys()).sort().join(", ");
    return {
      content: [
        {
          type: "text" as const,
          text: `Unknown tool: "${name}". Available tools: ${available}`,
        },
      ],
      isError: true,
    };
  }
  return reg.handler(params);
}

export function clearRegisteredTools(): void {
  registeredTools.clear();
}
