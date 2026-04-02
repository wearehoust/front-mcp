import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

const HandleSchema = z.object({
  source: z.string().min(1),
  handle: z.string().min(1),
});

export const ContactsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export const ContactsGetSchema = z.object({
  action: z.literal("get"),
  contact_id: IdSchema,
});

export const ContactsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  handles: z.array(HandleSchema).min(1),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const ContactsUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  contact_id: IdSchema,
  name: z.string().optional(),
  description: z.string().optional(),
});

export const ContactsDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  contact_id: IdSchema,
});

export const ContactsMergeSchema = ConfirmParamSchema.extend({
  action: z.literal("merge"),
  target_contact_id: IdSchema,
  source_contact_id: IdSchema,
});

export const ContactsListConversationsSchema = z.object({
  action: z.literal("list_conversations"),
  contact_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const ContactsAddHandleSchema = ConfirmParamSchema.extend({
  action: z.literal("add_handle"),
  contact_id: IdSchema,
  source: z.string().min(1),
  handle: z.string().min(1),
});

export const ContactsRemoveHandleSchema = ConfirmParamSchema.extend({
  action: z.literal("remove_handle"),
  contact_id: IdSchema,
  handle_id: IdSchema,
});

export const ContactsInputSchema = z.discriminatedUnion("action", [
  ContactsListSchema,
  ContactsGetSchema,
  ContactsCreateSchema,
  ContactsUpdateSchema,
  ContactsDeleteSchema,
  ContactsMergeSchema,
  ContactsListConversationsSchema,
  ContactsAddHandleSchema,
  ContactsRemoveHandleSchema,
]);

export type ContactsInput = z.infer<typeof ContactsInputSchema>;
export type ContactsListInput = z.infer<typeof ContactsListSchema>;
export type ContactsGetInput = z.infer<typeof ContactsGetSchema>;
export type ContactsCreateInput = z.infer<typeof ContactsCreateSchema>;
export type ContactsUpdateInput = z.infer<typeof ContactsUpdateSchema>;
export type ContactsDeleteInput = z.infer<typeof ContactsDeleteSchema>;
export type ContactsMergeInput = z.infer<typeof ContactsMergeSchema>;
export type ContactsListConversationsInput = z.infer<typeof ContactsListConversationsSchema>;
export type ContactsAddHandleInput = z.infer<typeof ContactsAddHandleSchema>;
export type ContactsRemoveHandleInput = z.infer<typeof ContactsRemoveHandleSchema>;
