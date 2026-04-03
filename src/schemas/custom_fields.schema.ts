import { z } from "zod";
import { PaginationParamsSchema } from "./common.schema.js";

export const CustomFieldsListForAccountsSchema = PaginationParamsSchema.extend({
  action: z.literal("list_for_accounts"),
});

export const CustomFieldsListForContactsSchema = PaginationParamsSchema.extend({
  action: z.literal("list_for_contacts"),
});

export const CustomFieldsListForConversationsSchema = PaginationParamsSchema.extend({
  action: z.literal("list_for_conversations"),
});

export const CustomFieldsListForInboxesSchema = PaginationParamsSchema.extend({
  action: z.literal("list_for_inboxes"),
});

export const CustomFieldsListForLinksSchema = PaginationParamsSchema.extend({
  action: z.literal("list_for_links"),
});

export const CustomFieldsListForTeammatesSchema = PaginationParamsSchema.extend({
  action: z.literal("list_for_teammates"),
});

export const CustomFieldsSchema = z.discriminatedUnion("action", [
  CustomFieldsListForAccountsSchema,
  CustomFieldsListForContactsSchema,
  CustomFieldsListForConversationsSchema,
  CustomFieldsListForInboxesSchema,
  CustomFieldsListForLinksSchema,
  CustomFieldsListForTeammatesSchema,
]);

export type CustomFieldsInput = z.infer<typeof CustomFieldsSchema>;
export type CustomFieldsListForAccountsInput = z.infer<typeof CustomFieldsListForAccountsSchema>;
export type CustomFieldsListForContactsInput = z.infer<typeof CustomFieldsListForContactsSchema>;
export type CustomFieldsListForConversationsInput = z.infer<typeof CustomFieldsListForConversationsSchema>;
export type CustomFieldsListForInboxesInput = z.infer<typeof CustomFieldsListForInboxesSchema>;
export type CustomFieldsListForLinksInput = z.infer<typeof CustomFieldsListForLinksSchema>;
export type CustomFieldsListForTeammatesInput = z.infer<typeof CustomFieldsListForTeammatesSchema>;
