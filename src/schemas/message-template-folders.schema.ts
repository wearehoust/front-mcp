import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const MessageTemplateFoldersListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const MessageTemplateFoldersGetSchema = z.object({
  action: z.literal("get"),
  folder_id: IdSchema,
});

export const MessageTemplateFoldersCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  parent_folder_id: z.string().optional(),
});

export const MessageTemplateFoldersUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  folder_id: IdSchema,
  name: z.string().min(1).optional(),
  parent_folder_id: z.string().optional(),
});

export const MessageTemplateFoldersDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  folder_id: IdSchema,
});

export const MessageTemplateFoldersListChildrenSchema = z.object({
  action: z.literal("list_children"),
  folder_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const MessageTemplateFoldersCreateChildSchema = ConfirmParamSchema.extend({
  action: z.literal("create_child"),
  folder_id: IdSchema,
  name: z.string().min(1),
});

export const MessageTemplateFoldersSchema = z.discriminatedUnion("action", [
  MessageTemplateFoldersListSchema,
  MessageTemplateFoldersGetSchema,
  MessageTemplateFoldersCreateSchema,
  MessageTemplateFoldersUpdateSchema,
  MessageTemplateFoldersDeleteSchema,
  MessageTemplateFoldersListChildrenSchema,
  MessageTemplateFoldersCreateChildSchema,
]);

export type MessageTemplateFoldersInput = z.infer<typeof MessageTemplateFoldersSchema>;
export type MessageTemplateFoldersListInput = z.infer<typeof MessageTemplateFoldersListSchema>;
export type MessageTemplateFoldersGetInput = z.infer<typeof MessageTemplateFoldersGetSchema>;
export type MessageTemplateFoldersCreateInput = z.infer<typeof MessageTemplateFoldersCreateSchema>;
export type MessageTemplateFoldersUpdateInput = z.infer<typeof MessageTemplateFoldersUpdateSchema>;
export type MessageTemplateFoldersDeleteInput = z.infer<typeof MessageTemplateFoldersDeleteSchema>;
export type MessageTemplateFoldersListChildrenInput = z.infer<typeof MessageTemplateFoldersListChildrenSchema>;
export type MessageTemplateFoldersCreateChildInput = z.infer<typeof MessageTemplateFoldersCreateChildSchema>;
