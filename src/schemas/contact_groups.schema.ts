import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const ContactGroupsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const ContactGroupsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
});

export const ContactGroupsDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  contact_group_id: IdSchema,
});

export const ContactGroupsListContactsSchema = z.object({
  action: z.literal("list_contacts"),
  contact_group_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const ContactGroupsAddContactsSchema = ConfirmParamSchema.extend({
  action: z.literal("add_contacts"),
  contact_group_id: IdSchema,
  contact_ids: z.array(IdSchema).min(1),
});

export const ContactGroupsRemoveContactsSchema = ConfirmParamSchema.extend({
  action: z.literal("remove_contacts"),
  contact_group_id: IdSchema,
  contact_ids: z.array(IdSchema).min(1),
});

export const ContactGroupsSchema = z.discriminatedUnion("action", [
  ContactGroupsListSchema,
  ContactGroupsCreateSchema,
  ContactGroupsDeleteSchema,
  ContactGroupsListContactsSchema,
  ContactGroupsAddContactsSchema,
  ContactGroupsRemoveContactsSchema,
]);

export type ContactGroupsInput = z.infer<typeof ContactGroupsSchema>;
export type ContactGroupsListInput = z.infer<typeof ContactGroupsListSchema>;
export type ContactGroupsCreateInput = z.infer<typeof ContactGroupsCreateSchema>;
export type ContactGroupsDeleteInput = z.infer<typeof ContactGroupsDeleteSchema>;
export type ContactGroupsListContactsInput = z.infer<typeof ContactGroupsListContactsSchema>;
export type ContactGroupsAddContactsInput = z.infer<typeof ContactGroupsAddContactsSchema>;
export type ContactGroupsRemoveContactsInput = z.infer<typeof ContactGroupsRemoveContactsSchema>;
