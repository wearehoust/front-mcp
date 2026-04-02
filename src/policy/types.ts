import { z } from "zod";

export type ActionTier = "read" | "write" | "destructive";
export type PolicyDecision = "allow" | "confirm" | "deny";

export const PolicyRuleSchema = z.object({
  tool: z.string(),
  action: z.string(),
  decision: z.enum(["allow", "confirm", "deny"]),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyConfigSchema = z.object({
  defaults: z
    .record(z.enum(["read", "write", "destructive"]), z.enum(["allow", "confirm", "deny"]))
    .default({
      read: "allow",
      write: "confirm",
      destructive: "deny",
    }),
  overrides: z.array(PolicyRuleSchema).default([]),
});

export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

export interface PolicyEvaluation {
  decision: PolicyDecision;
  tier: ActionTier;
  message?: string;
}
