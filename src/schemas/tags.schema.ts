import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const TagsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const TagsGetSchema = z.object({
  action: z.literal("get"),
  tag_id: IdSchema,
});

export const TagsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  highlight: z.string().optional(),
  is_visible_in_conversation_lists: z.boolean().optional(),
});

export const TagsUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  tag_id: IdSchema,
  name: z.string().min(1).optional(),
  highlight: z.string().optional(),
  is_visible_in_conversation_lists: z.boolean().optional(),
});

export const TagsDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  tag_id: IdSchema,
});

export const TagsListChildrenSchema = z.object({
  action: z.literal("list_children"),
  tag_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TagsCreateChildSchema = ConfirmParamSchema.extend({
  action: z.literal("create_child"),
  tag_id: IdSchema,
  name: z.string().min(1),
  highlight: z.string().optional(),
});

export const TagsListConversationsSchema = z.object({
  action: z.literal("list_conversations"),
  tag_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TagsSchema = z.discriminatedUnion("action", [
  TagsListSchema,
  TagsGetSchema,
  TagsCreateSchema,
  TagsUpdateSchema,
  TagsDeleteSchema,
  TagsListChildrenSchema,
  TagsCreateChildSchema,
  TagsListConversationsSchema,
]);

export type TagsInput = z.infer<typeof TagsSchema>;
export type TagsListInput = z.infer<typeof TagsListSchema>;
export type TagsGetInput = z.infer<typeof TagsGetSchema>;
export type TagsCreateInput = z.infer<typeof TagsCreateSchema>;
export type TagsUpdateInput = z.infer<typeof TagsUpdateSchema>;
export type TagsDeleteInput = z.infer<typeof TagsDeleteSchema>;
export type TagsListChildrenInput = z.infer<typeof TagsListChildrenSchema>;
export type TagsCreateChildInput = z.infer<typeof TagsCreateChildSchema>;
export type TagsListConversationsInput = z.infer<typeof TagsListConversationsSchema>;
