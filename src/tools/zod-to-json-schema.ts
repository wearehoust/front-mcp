import type { z } from "zod";

interface JsonSchemaProperty {
  type?: string;
  enum?: string[];
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaProperty;
}

interface JsonSchema {
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

function zodTypeToJsonSchema(schema: z.ZodTypeAny): JsonSchemaProperty {
  const def = schema._def as Record<string, unknown>;
  const typeName = def["typeName"] as string | undefined;

  if (typeName === "ZodString") {
    const result: JsonSchemaProperty = { type: "string" };
    if (typeof def["description"] === "string") {
      result.description = def["description"] as string;
    }
    return result;
  }

  if (typeName === "ZodNumber") {
    return { type: "number" };
  }

  if (typeName === "ZodBoolean") {
    return { type: "boolean" };
  }

  if (typeName === "ZodEnum") {
    return {
      type: "string",
      enum: def["values"] as string[],
      description: typeof def["description"] === "string" ? def["description"] as string : undefined,
    };
  }

  if (typeName === "ZodOptional") {
    return zodTypeToJsonSchema(def["innerType"] as z.ZodTypeAny);
  }

  if (typeName === "ZodArray") {
    return {
      type: "array",
      items: zodTypeToJsonSchema(def["type"] as z.ZodTypeAny),
    };
  }

  if (typeName === "ZodObject") {
    const shape = (schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToJsonSchema(value);
      const innerDef = value._def as Record<string, unknown>;
      if (innerDef["typeName"] !== "ZodOptional") {
        required.push(key);
      }
    }
    const result: JsonSchemaProperty = { type: "object", properties };
    if (required.length > 0) {
      result.required = required;
    }
    return result;
  }

  if (typeName === "ZodRecord") {
    return {
      type: "object",
      additionalProperties: true,
    };
  }

  if (typeName === "ZodUnknown") {
    return {};
  }

  return {};
}

export function zodToJsonSchema(shape: Record<string, z.ZodTypeAny>): JsonSchema {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    properties[key] = zodTypeToJsonSchema(value);
    const def = value._def as Record<string, unknown>;
    if (def["typeName"] !== "ZodOptional") {
      required.push(key);
    }
  }

  return { properties, required };
}
