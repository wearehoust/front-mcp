import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const ContactListsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const ContactListsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
});

export const ContactListsDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  contact_list_id: IdSchema,
});

export const ContactListsListContactsSchema = z.object({
  action: z.literal("list_contacts"),
  contact_list_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const ContactListsAddContactsSchema = ConfirmParamSchema.extend({
  action: z.literal("add_contacts"),
  contact_list_id: IdSchema,
  contact_ids: z.array(z.string().min(1)).min(1),
});

export const ContactListsRemoveContactsSchema = ConfirmParamSchema.extend({
  action: z.literal("remove_contacts"),
  contact_list_id: IdSchema,
  contact_ids: z.array(z.string().min(1)).min(1),
});

export const ContactListsSchema = z.discriminatedUnion("action", [
  ContactListsListSchema,
  ContactListsCreateSchema,
  ContactListsDeleteSchema,
  ContactListsListContactsSchema,
  ContactListsAddContactsSchema,
  ContactListsRemoveContactsSchema,
]);

export type ContactListsInput = z.infer<typeof ContactListsSchema>;
export type ContactListsListInput = z.infer<typeof ContactListsListSchema>;
export type ContactListsCreateInput = z.infer<typeof ContactListsCreateSchema>;
export type ContactListsDeleteInput = z.infer<typeof ContactListsDeleteSchema>;
export type ContactListsListContactsInput = z.infer<typeof ContactListsListContactsSchema>;
export type ContactListsAddContactsInput = z.infer<typeof ContactListsAddContactsSchema>;
export type ContactListsRemoveContactsInput = z.infer<typeof ContactListsRemoveContactsSchema>;
