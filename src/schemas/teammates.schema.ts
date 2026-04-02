import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

const TeammateIdSchema = z.object({ teammate_id: IdSchema });

export const TeammatesListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const TeammatesGetSchema = TeammateIdSchema.extend({
  action: z.literal("get"),
});

export const TeammatesUpdateSchema = TeammateIdSchema.merge(ConfirmParamSchema).extend({
  action: z.literal("update"),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_available: z.boolean().optional(),
  custom_fields: z.record(z.unknown()).optional(),
});

export const TeammatesListConversationsSchema = TeammateIdSchema.merge(PaginationParamsSchema).extend({
  action: z.literal("list_conversations"),
});

export const TeammatesListInboxesSchema = TeammateIdSchema.extend({
  action: z.literal("list_inboxes"),
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TeammatesSchema = z.discriminatedUnion("action", [
  TeammatesListSchema,
  TeammatesGetSchema,
  TeammatesUpdateSchema,
  TeammatesListConversationsSchema,
  TeammatesListInboxesSchema,
]);

export type TeammatesInput = z.infer<typeof TeammatesSchema>;
export type TeammatesListInput = z.infer<typeof TeammatesListSchema>;
export type TeammatesGetInput = z.infer<typeof TeammatesGetSchema>;
export type TeammatesUpdateInput = z.infer<typeof TeammatesUpdateSchema>;
export type TeammatesListConversationsInput = z.infer<typeof TeammatesListConversationsSchema>;
export type TeammatesListInboxesInput = z.infer<typeof TeammatesListInboxesSchema>;
