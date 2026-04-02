import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const LinksListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
  name: z.string().optional(),
  type: z.string().optional(),
});

export const LinksGetSchema = z.object({
  action: z.literal("get"),
  link_id: IdSchema,
});

export const LinksCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  external_url: z.string().url(),
  type: z.string().optional(),
  pattern: z.string().optional(),
});

export const LinksUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  link_id: IdSchema,
  name: z.string().optional(),
});

export const LinksListConversationsSchema = z.object({
  action: z.literal("list_conversations"),
  link_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const LinksSchema = z.discriminatedUnion("action", [
  LinksListSchema,
  LinksGetSchema,
  LinksCreateSchema,
  LinksUpdateSchema,
  LinksListConversationsSchema,
]);

export type LinksInput = z.infer<typeof LinksSchema>;
export type LinksListInput = z.infer<typeof LinksListSchema>;
export type LinksGetInput = z.infer<typeof LinksGetSchema>;
export type LinksCreateInput = z.infer<typeof LinksCreateSchema>;
export type LinksUpdateInput = z.infer<typeof LinksUpdateSchema>;
export type LinksListConversationsInput = z.infer<typeof LinksListConversationsSchema>;
