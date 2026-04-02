import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

const ConversationIdSchema = z.object({ conversation_id: IdSchema });

const TeammateIdsSchema = z.object({
  teammate_ids: z.array(IdSchema).min(1),
});

// ---------------------------------------------------------------------------
// Action variant schemas
// ---------------------------------------------------------------------------

const ListParamsSchema = z
  .object({
    action: z.literal("list"),
    statuses: z
      .array(z.enum(["assigned", "unassigned", "archived", "deleted", "spam", "open"]))
      .optional(),
  })
  .merge(PaginationParamsSchema);

const GetParamsSchema = z.object({
  action: z.literal("get"),
  conversation_id: IdSchema,
});

const SearchParamsSchema = z
  .object({
    action: z.literal("search"),
    query: z.string().min(1),
  })
  .merge(PaginationParamsSchema);

const CreateParamsSchema = z
  .object({
    action: z.literal("create"),
    type: z.enum(["discussion", "email"]).optional(),
    inbox_id: z.string().optional(),
    teammate_ids: z.array(IdSchema).optional(),
    subject: z.string().optional(),
    comment: z
      .object({
        author_id: z.string(),
        body: z.string(),
      })
      .optional(),
    tags: z.array(z.string()).optional(),
  })
  .merge(ConfirmParamSchema);

const UpdateParamsSchema = z
  .object({
    action: z.literal("update"),
    conversation_id: IdSchema,
    assignee_id: z.string().optional(),
    inbox_id: z.string().optional(),
    status: z.enum(["archived", "open", "spam"]).optional(),
    tags: z.array(z.string()).optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
  })
  .merge(ConfirmParamSchema);

const DeleteParamsSchema = z
  .object({
    action: z.literal("delete"),
    conversation_id: IdSchema,
  })
  .merge(ConfirmParamSchema);

const AssignParamsSchema = z
  .object({
    action: z.literal("assign"),
    conversation_id: IdSchema,
    assignee_id: z.string().optional(),
  })
  .merge(ConfirmParamSchema);

const ListEventsParamsSchema = z
  .object({
    action: z.literal("list_events"),
  })
  .merge(ConversationIdSchema)
  .merge(PaginationParamsSchema);

const ListFollowersParamsSchema = z
  .object({
    action: z.literal("list_followers"),
  })
  .merge(ConversationIdSchema);

const AddFollowersParamsSchema = z
  .object({
    action: z.literal("add_followers"),
  })
  .merge(ConversationIdSchema)
  .merge(TeammateIdsSchema)
  .merge(ConfirmParamSchema);

const RemoveFollowersParamsSchema = z
  .object({
    action: z.literal("remove_followers"),
  })
  .merge(ConversationIdSchema)
  .merge(TeammateIdsSchema)
  .merge(ConfirmParamSchema);

const ListInboxesParamsSchema = z
  .object({
    action: z.literal("list_inboxes"),
  })
  .merge(ConversationIdSchema);

const AddLinkParamsSchema = z
  .object({
    action: z.literal("add_link"),
    conversation_id: IdSchema,
    link_id: IdSchema,
  })
  .merge(ConfirmParamSchema);

const RemoveLinksParamsSchema = z
  .object({
    action: z.literal("remove_links"),
    conversation_id: IdSchema,
    link_ids: z.array(IdSchema).min(1),
  })
  .merge(ConfirmParamSchema);

const ListMessagesParamsSchema = z
  .object({
    action: z.literal("list_messages"),
  })
  .merge(ConversationIdSchema)
  .merge(PaginationParamsSchema);

const UpdateRemindersParamsSchema = z
  .object({
    action: z.literal("update_reminders"),
    conversation_id: IdSchema,
    teammate_id: z.string(),
    scheduled_at: z.string().optional(),
  })
  .merge(ConfirmParamSchema);

const AddTagParamsSchema = z
  .object({
    action: z.literal("add_tag"),
    conversation_id: IdSchema,
    tag_id: IdSchema,
  })
  .merge(ConfirmParamSchema);

const RemoveTagParamsSchema = z
  .object({
    action: z.literal("remove_tag"),
    conversation_id: IdSchema,
    tag_ids: z.array(IdSchema).min(1),
  })
  .merge(ConfirmParamSchema);

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export const ConversationsParamsSchema = z.discriminatedUnion("action", [
  ListParamsSchema,
  GetParamsSchema,
  SearchParamsSchema,
  CreateParamsSchema,
  UpdateParamsSchema,
  DeleteParamsSchema,
  AssignParamsSchema,
  ListEventsParamsSchema,
  ListFollowersParamsSchema,
  AddFollowersParamsSchema,
  RemoveFollowersParamsSchema,
  ListInboxesParamsSchema,
  AddLinkParamsSchema,
  RemoveLinksParamsSchema,
  ListMessagesParamsSchema,
  UpdateRemindersParamsSchema,
  AddTagParamsSchema,
  RemoveTagParamsSchema,
]);

export type ConversationsParams = z.infer<typeof ConversationsParamsSchema>;
