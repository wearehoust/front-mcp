import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

const GroupIdSchema = z.object({ group_id: IdSchema });
const InboxIdsSchema = z.object({ inbox_ids: z.array(IdSchema).min(1) });
const TeammateIdsSchema = z.object({ teammate_ids: z.array(IdSchema).min(1) });
const TeamIdsSchema = z.object({ team_ids: z.array(IdSchema).min(1) });

export const TeammateGroupsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const TeammateGroupsGetSchema = GroupIdSchema.extend({
  action: z.literal("get"),
});

export const TeammateGroupsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
});

export const TeammateGroupsUpdateSchema = GroupIdSchema.merge(ConfirmParamSchema).extend({
  action: z.literal("update"),
  name: z.string().min(1).optional(),
});

export const TeammateGroupsDeleteSchema = GroupIdSchema.merge(ConfirmParamSchema).extend({
  action: z.literal("delete"),
});

export const TeammateGroupsListInboxesSchema = GroupIdSchema.extend({
  action: z.literal("list_inboxes"),
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TeammateGroupsAddInboxesSchema = GroupIdSchema.merge(InboxIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("add_inboxes"),
});

export const TeammateGroupsRemoveInboxesSchema = GroupIdSchema.merge(InboxIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("remove_inboxes"),
});

export const TeammateGroupsListTeammatesSchema = GroupIdSchema.extend({
  action: z.literal("list_teammates"),
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TeammateGroupsAddTeammatesSchema = GroupIdSchema.merge(TeammateIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("add_teammates"),
});

export const TeammateGroupsRemoveTeammatesSchema = GroupIdSchema.merge(TeammateIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("remove_teammates"),
});

export const TeammateGroupsListTeamsSchema = GroupIdSchema.extend({
  action: z.literal("list_teams"),
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TeammateGroupsAddTeamsSchema = GroupIdSchema.merge(TeamIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("add_teams"),
});

export const TeammateGroupsRemoveTeamsSchema = GroupIdSchema.merge(TeamIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("remove_teams"),
});

export const TeammateGroupsSchema = z.discriminatedUnion("action", [
  TeammateGroupsListSchema,
  TeammateGroupsGetSchema,
  TeammateGroupsCreateSchema,
  TeammateGroupsUpdateSchema,
  TeammateGroupsDeleteSchema,
  TeammateGroupsListInboxesSchema,
  TeammateGroupsAddInboxesSchema,
  TeammateGroupsRemoveInboxesSchema,
  TeammateGroupsListTeammatesSchema,
  TeammateGroupsAddTeammatesSchema,
  TeammateGroupsRemoveTeammatesSchema,
  TeammateGroupsListTeamsSchema,
  TeammateGroupsAddTeamsSchema,
  TeammateGroupsRemoveTeamsSchema,
]);

export type TeammateGroupsInput = z.infer<typeof TeammateGroupsSchema>;
export type TeammateGroupsListInput = z.infer<typeof TeammateGroupsListSchema>;
export type TeammateGroupsGetInput = z.infer<typeof TeammateGroupsGetSchema>;
export type TeammateGroupsCreateInput = z.infer<typeof TeammateGroupsCreateSchema>;
export type TeammateGroupsUpdateInput = z.infer<typeof TeammateGroupsUpdateSchema>;
export type TeammateGroupsDeleteInput = z.infer<typeof TeammateGroupsDeleteSchema>;
export type TeammateGroupsListInboxesInput = z.infer<typeof TeammateGroupsListInboxesSchema>;
export type TeammateGroupsAddInboxesInput = z.infer<typeof TeammateGroupsAddInboxesSchema>;
export type TeammateGroupsRemoveInboxesInput = z.infer<typeof TeammateGroupsRemoveInboxesSchema>;
export type TeammateGroupsListTeammatesInput = z.infer<typeof TeammateGroupsListTeammatesSchema>;
export type TeammateGroupsAddTeammatesInput = z.infer<typeof TeammateGroupsAddTeammatesSchema>;
export type TeammateGroupsRemoveTeammatesInput = z.infer<typeof TeammateGroupsRemoveTeammatesSchema>;
export type TeammateGroupsListTeamsInput = z.infer<typeof TeammateGroupsListTeamsSchema>;
export type TeammateGroupsAddTeamsInput = z.infer<typeof TeammateGroupsAddTeamsSchema>;
export type TeammateGroupsRemoveTeamsInput = z.infer<typeof TeammateGroupsRemoveTeamsSchema>;
