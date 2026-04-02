import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

const TeamIdSchema = z.object({ team_id: IdSchema });
const TeammateIdsSchema = z.object({ teammate_ids: z.array(IdSchema).min(1) });

export const TeamsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const TeamsGetSchema = TeamIdSchema.extend({
  action: z.literal("get"),
});

export const TeamsAddTeammatesSchema = TeamIdSchema.merge(TeammateIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("add_teammates"),
});

export const TeamsRemoveTeammatesSchema = TeamIdSchema.merge(TeammateIdsSchema).merge(ConfirmParamSchema).extend({
  action: z.literal("remove_teammates"),
});

export const TeamsSchema = z.discriminatedUnion("action", [
  TeamsListSchema,
  TeamsGetSchema,
  TeamsAddTeammatesSchema,
  TeamsRemoveTeammatesSchema,
]);

export type TeamsInput = z.infer<typeof TeamsSchema>;
export type TeamsListInput = z.infer<typeof TeamsListSchema>;
export type TeamsGetInput = z.infer<typeof TeamsGetSchema>;
export type TeamsAddTeammatesInput = z.infer<typeof TeamsAddTeammatesSchema>;
export type TeamsRemoveTeammatesInput = z.infer<typeof TeamsRemoveTeammatesSchema>;
