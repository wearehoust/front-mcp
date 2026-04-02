import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const AccountsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const AccountsGetSchema = z.object({
  action: z.literal("get"),
  account_id: IdSchema,
});

export const AccountsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  description: z.string().optional(),
  domains: z.array(z.string()).optional(),
  external_id: z.string().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

export const AccountsUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  account_id: IdSchema,
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  domains: z.array(z.string()).optional(),
  external_id: z.string().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

export const AccountsDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  account_id: IdSchema,
});

export const AccountsListContactsSchema = z.object({
  action: z.literal("list_contacts"),
  account_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const AccountsAddContactSchema = ConfirmParamSchema.extend({
  action: z.literal("add_contact"),
  account_id: IdSchema,
  contact_id: IdSchema,
});

export const AccountsRemoveContactSchema = ConfirmParamSchema.extend({
  action: z.literal("remove_contact"),
  account_id: IdSchema,
  contact_id: IdSchema,
});

export const AccountsSchema = z.discriminatedUnion("action", [
  AccountsListSchema,
  AccountsGetSchema,
  AccountsCreateSchema,
  AccountsUpdateSchema,
  AccountsDeleteSchema,
  AccountsListContactsSchema,
  AccountsAddContactSchema,
  AccountsRemoveContactSchema,
]);

export type AccountsInput = z.infer<typeof AccountsSchema>;
export type AccountsListInput = z.infer<typeof AccountsListSchema>;
export type AccountsGetInput = z.infer<typeof AccountsGetSchema>;
export type AccountsCreateInput = z.infer<typeof AccountsCreateSchema>;
export type AccountsUpdateInput = z.infer<typeof AccountsUpdateSchema>;
export type AccountsDeleteInput = z.infer<typeof AccountsDeleteSchema>;
export type AccountsListContactsInput = z.infer<typeof AccountsListContactsSchema>;
export type AccountsAddContactInput = z.infer<typeof AccountsAddContactSchema>;
export type AccountsRemoveContactInput = z.infer<typeof AccountsRemoveContactSchema>;
