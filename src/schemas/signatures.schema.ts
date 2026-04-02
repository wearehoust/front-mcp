import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

const SignatureIdSchema = z.object({ signature_id: IdSchema });

export const SignaturesListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const SignaturesGetSchema = SignatureIdSchema.extend({
  action: z.literal("get"),
});

export const SignaturesUpdateSchema = SignatureIdSchema.merge(ConfirmParamSchema).extend({
  action: z.literal("update"),
  name: z.string().min(1).optional(),
  body: z.string().optional(),
  sender_info: z.string().optional(),
  is_visible_for_all_teammate_channels: z.boolean().optional(),
  is_default: z.boolean().optional(),
  channel_ids: z.array(IdSchema).optional(),
});

export const SignaturesDeleteSchema = SignatureIdSchema.merge(ConfirmParamSchema).extend({
  action: z.literal("delete"),
});

export const SignaturesCreateForTeammateSchema = ConfirmParamSchema.extend({
  action: z.literal("create_for_teammate"),
  teammate_id: IdSchema,
  name: z.string().min(1),
  body: z.string().optional(),
  sender_info: z.string().optional(),
  is_visible_for_all_teammate_channels: z.boolean().optional(),
  is_default: z.boolean().optional(),
  channel_ids: z.array(IdSchema).optional(),
});

export const SignaturesCreateForTeamSchema = ConfirmParamSchema.extend({
  action: z.literal("create_for_team"),
  team_id: IdSchema,
  name: z.string().min(1),
  body: z.string().optional(),
  sender_info: z.string().optional(),
  is_visible_for_all_teammate_channels: z.boolean().optional(),
  is_default: z.boolean().optional(),
  channel_ids: z.array(IdSchema).optional(),
});

export const SignaturesSchema = z.discriminatedUnion("action", [
  SignaturesListSchema,
  SignaturesGetSchema,
  SignaturesUpdateSchema,
  SignaturesDeleteSchema,
  SignaturesCreateForTeammateSchema,
  SignaturesCreateForTeamSchema,
]);

export type SignaturesInput = z.infer<typeof SignaturesSchema>;
export type SignaturesListInput = z.infer<typeof SignaturesListSchema>;
export type SignaturesGetInput = z.infer<typeof SignaturesGetSchema>;
export type SignaturesUpdateInput = z.infer<typeof SignaturesUpdateSchema>;
export type SignaturesDeleteInput = z.infer<typeof SignaturesDeleteSchema>;
export type SignaturesCreateForTeammateInput = z.infer<typeof SignaturesCreateForTeammateSchema>;
export type SignaturesCreateForTeamInput = z.infer<typeof SignaturesCreateForTeamSchema>;
