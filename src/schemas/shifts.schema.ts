import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

const ShiftIdSchema = z.object({ shift_id: IdSchema });
const TeammateIdsSchema = z.object({ teammate_ids: z.array(IdSchema).min(1) });

export const ShiftsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const ShiftsGetSchema = ShiftIdSchema.extend({
  action: z.literal("get"),
});

export const ShiftsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  color: z.string().optional(),
  timezone: z.string().optional(),
  times: z.record(z.unknown()).optional(),
});

export const ShiftsUpdateSchema = ShiftIdSchema.merge(ConfirmParamSchema).extend({
  action: z.literal("update"),
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  timezone: z.string().optional(),
  times: z.record(z.unknown()).optional(),
});

export const ShiftsListTeammatesSchema = ShiftIdSchema.extend({
  action: z.literal("list_teammates"),
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const ShiftsAddTeammatesSchema = ShiftIdSchema.merge(TeammateIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("add_teammates"),
});

export const ShiftsRemoveTeammatesSchema = ShiftIdSchema.merge(TeammateIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("remove_teammates"),
});

export const ShiftsSchema = z.discriminatedUnion("action", [
  ShiftsListSchema,
  ShiftsGetSchema,
  ShiftsCreateSchema,
  ShiftsUpdateSchema,
  ShiftsListTeammatesSchema,
  ShiftsAddTeammatesSchema,
  ShiftsRemoveTeammatesSchema,
]);

export type ShiftsInput = z.infer<typeof ShiftsSchema>;
export type ShiftsListInput = z.infer<typeof ShiftsListSchema>;
export type ShiftsGetInput = z.infer<typeof ShiftsGetSchema>;
export type ShiftsCreateInput = z.infer<typeof ShiftsCreateSchema>;
export type ShiftsUpdateInput = z.infer<typeof ShiftsUpdateSchema>;
export type ShiftsListTeammatesInput = z.infer<typeof ShiftsListTeammatesSchema>;
export type ShiftsAddTeammatesInput = z.infer<typeof ShiftsAddTeammatesSchema>;
export type ShiftsRemoveTeammatesInput = z.infer<typeof ShiftsRemoveTeammatesSchema>;
