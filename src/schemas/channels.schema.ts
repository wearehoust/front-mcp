import { z } from "zod";
import { ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const ChannelsListSchema = z.object({
  action: z.literal("list"),
});

export const ChannelsGetSchema = z.object({
  action: z.literal("get"),
  channel_id: IdSchema,
});

export const ChannelsUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  channel_id: IdSchema,
  name: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const ChannelsValidateSchema = ConfirmParamSchema.extend({
  action: z.literal("validate"),
  channel_id: IdSchema,
});

export const ChannelsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  type: z.string().min(1),
  name: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  inbox_id: z.string().optional(),
});

export const ChannelsListForTeammateSchema = z.object({
  action: z.literal("list_for_teammate"),
  teammate_id: IdSchema,
});

export const ChannelsListForTeamSchema = z.object({
  action: z.literal("list_for_team"),
  team_id: IdSchema,
});

export const ChannelsSchema = z.discriminatedUnion("action", [
  ChannelsListSchema,
  ChannelsGetSchema,
  ChannelsUpdateSchema,
  ChannelsValidateSchema,
  ChannelsCreateSchema,
  ChannelsListForTeammateSchema,
  ChannelsListForTeamSchema,
]);

export type ChannelsInput = z.infer<typeof ChannelsSchema>;
export type ChannelsListInput = z.infer<typeof ChannelsListSchema>;
export type ChannelsGetInput = z.infer<typeof ChannelsGetSchema>;
export type ChannelsUpdateInput = z.infer<typeof ChannelsUpdateSchema>;
export type ChannelsValidateInput = z.infer<typeof ChannelsValidateSchema>;
export type ChannelsCreateInput = z.infer<typeof ChannelsCreateSchema>;
export type ChannelsListForTeammateInput = z.infer<typeof ChannelsListForTeammateSchema>;
export type ChannelsListForTeamInput = z.infer<typeof ChannelsListForTeamSchema>;
