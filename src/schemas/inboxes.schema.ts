import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

const InboxIdSchema = z.object({ inbox_id: IdSchema });

const TeammateIdsSchema = z.object({
  teammate_ids: z.array(IdSchema).min(1),
});

// ---------------------------------------------------------------------------
// Action variant schemas
// ---------------------------------------------------------------------------

const ListParamsSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

const GetParamsSchema = InboxIdSchema.extend({
  action: z.literal("get"),
});

const CreateParamsSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  teammate_ids: z.array(IdSchema).optional(),
});

const ListChannelsParamsSchema = InboxIdSchema.extend({
  action: z.literal("list_channels"),
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const ListConversationsParamsSchema = InboxIdSchema
  .merge(PaginationParamsSchema)
  .extend({
    action: z.literal("list_conversations"),
  });

const ListAccessParamsSchema = InboxIdSchema.extend({
  action: z.literal("list_access"),
});

const GrantAccessParamsSchema = InboxIdSchema
  .merge(TeammateIdsSchema)
  .merge(ConfirmParamSchema)
  .extend({
    action: z.literal("grant_access"),
  });

const RevokeAccessParamsSchema = InboxIdSchema
  .merge(TeammateIdsSchema)
  .merge(ConfirmParamSchema)
  .extend({
    action: z.literal("revoke_access"),
  });

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export const InboxesParamsSchema = z.discriminatedUnion("action", [
  ListParamsSchema,
  GetParamsSchema,
  CreateParamsSchema,
  ListChannelsParamsSchema,
  ListConversationsParamsSchema,
  ListAccessParamsSchema,
  GrantAccessParamsSchema,
  RevokeAccessParamsSchema,
]);

export type InboxesParams = z.infer<typeof InboxesParamsSchema>;
export type InboxesListInput = z.infer<typeof ListParamsSchema>;
export type InboxesGetInput = z.infer<typeof GetParamsSchema>;
export type InboxesCreateInput = z.infer<typeof CreateParamsSchema>;
export type InboxesListChannelsInput = z.infer<typeof ListChannelsParamsSchema>;
export type InboxesListConversationsInput = z.infer<typeof ListConversationsParamsSchema>;
export type InboxesListAccessInput = z.infer<typeof ListAccessParamsSchema>;
export type InboxesGrantAccessInput = z.infer<typeof GrantAccessParamsSchema>;
export type InboxesRevokeAccessInput = z.infer<typeof RevokeAccessParamsSchema>;
