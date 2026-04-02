import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const RulesListSchema = z.object({
  action: z.literal("list"),
});

export const RulesListForInboxSchema = z.object({
  action: z.literal("list_for_inbox"),
  inbox_id: IdSchema,
});

export const RulesGetSchema = z.object({
  action: z.literal("get"),
  rule_id: IdSchema,
});

export const RulesListForTeammateSchema = z.object({
  action: z.literal("list_for_teammate"),
  teammate_id: IdSchema,
});

export const RulesListForTeamSchema = z.object({
  action: z.literal("list_for_team"),
  team_id: IdSchema,
});

export const RulesSchema = z.discriminatedUnion("action", [
  RulesListSchema,
  RulesListForInboxSchema,
  RulesGetSchema,
  RulesListForTeammateSchema,
  RulesListForTeamSchema,
]);

export type RulesInput = z.infer<typeof RulesSchema>;
export type RulesListInput = z.infer<typeof RulesListSchema>;
export type RulesListForInboxInput = z.infer<typeof RulesListForInboxSchema>;
export type RulesGetInput = z.infer<typeof RulesGetSchema>;
export type RulesListForTeammateInput = z.infer<typeof RulesListForTeammateSchema>;
export type RulesListForTeamInput = z.infer<typeof RulesListForTeamSchema>;
