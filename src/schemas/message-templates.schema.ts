import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const MessageTemplatesListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const MessageTemplatesGetSchema = z.object({
  action: z.literal("get"),
  template_id: IdSchema,
});

export const MessageTemplatesCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  folder_id: z.string().optional(),
  inbox_ids: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

export const MessageTemplatesUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  template_id: IdSchema,
  name: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  folder_id: z.string().optional(),
  inbox_ids: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

export const MessageTemplatesDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  template_id: IdSchema,
});

export const MessageTemplatesSchema = z.discriminatedUnion("action", [
  MessageTemplatesListSchema,
  MessageTemplatesGetSchema,
  MessageTemplatesCreateSchema,
  MessageTemplatesUpdateSchema,
  MessageTemplatesDeleteSchema,
]);

export type MessageTemplatesInput = z.infer<typeof MessageTemplatesSchema>;
export type MessageTemplatesListInput = z.infer<typeof MessageTemplatesListSchema>;
export type MessageTemplatesGetInput = z.infer<typeof MessageTemplatesGetSchema>;
export type MessageTemplatesCreateInput = z.infer<typeof MessageTemplatesCreateSchema>;
export type MessageTemplatesUpdateInput = z.infer<typeof MessageTemplatesUpdateSchema>;
export type MessageTemplatesDeleteInput = z.infer<typeof MessageTemplatesDeleteSchema>;
