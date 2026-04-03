import { readFileSync, existsSync } from "node:fs";
import { getActionTier } from "./default-policy.js";
import {
  PolicyConfigSchema,
  type PolicyConfig,
  type PolicyDecision,
  type PolicyEvaluation,
  type ActionTier,
} from "./types.js";

const DEFAULT_DECISIONS: Record<ActionTier, PolicyDecision> = {
  read: "allow",
  write: "confirm",
  destructive: "deny",
};

const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface PendingConfirmation {
  expiresAt: number;
}

export class PolicyEngine {
  private config: PolicyConfig;
  private pendingConfirmations: Map<string, PendingConfirmation> = new Map();

  constructor(policyFilePath?: string) {
    this.config = this.loadPolicy(policyFilePath);
  }

  evaluate(
    tool: string,
    action: string,
    params?: Record<string, unknown>,
  ): PolicyEvaluation {
    const tier = getActionTier(tool, action);
    const decision = this.resolveDecision(tool, action, tier);

    if (decision === "deny") {
      return {
        decision: "deny",
        tier,
        message: this.buildDenyMessage(tool, action, tier),
      };
    }

    if (decision === "confirm") {
      const confirmParam = params?.["confirm"];
      if (confirmParam === true) {
        // Check if there's a valid pending confirmation
        const key = this.confirmationKey(tool, action, params);
        const pending = this.pendingConfirmations.get(key);
        if (pending !== undefined && pending.expiresAt > Date.now()) {
          this.pendingConfirmations.delete(key);
          return { decision: "allow", tier };
        }
        // Even without pending, confirm=true should allow execution
        return { decision: "allow", tier };
      }

      // Store pending confirmation
      const key = this.confirmationKey(tool, action, params);
      this.pendingConfirmations.set(key, {
        expiresAt: Date.now() + CONFIRMATION_TTL_MS,
      });

      return {
        decision: "confirm",
        tier,
        message: this.buildConfirmMessage(tool, action, params),
      };
    }

    return { decision: "allow", tier };
  }

  private resolveDecision(
    tool: string,
    action: string,
    tier: ActionTier,
  ): PolicyDecision {
    // Check specific action override first
    const specificOverride = this.config.overrides.find(
      (r) => r.tool === tool && r.action === action,
    );
    if (specificOverride !== undefined) {
      return specificOverride.decision;
    }

    // Check wildcard override for tool
    const wildcardOverride = this.config.overrides.find(
      (r) => r.tool === tool && r.action === "*",
    );
    if (wildcardOverride !== undefined) {
      return wildcardOverride.decision;
    }

    // Fall back to tier default
    const configDefault = this.config.defaults[tier];
    if (configDefault !== undefined) {
      return configDefault;
    }

    return DEFAULT_DECISIONS[tier];
  }

  private loadPolicy(policyFilePath?: string): PolicyConfig {
    if (typeof policyFilePath === "string" && policyFilePath.length > 0) {
      if (existsSync(policyFilePath)) {
        try {
          const raw = readFileSync(policyFilePath, "utf-8");
          const parsed: unknown = JSON.parse(raw);
          return PolicyConfigSchema.parse(parsed);
        } catch {
          process.stderr.write(
            `[front-mcp] WARNING: Policy file at "${policyFilePath}" is invalid (JSON parse or schema error). ` +
            `Falling back to default policy. Fix the file and restart the server.\n`,
          );
        }
      }
    }

    return PolicyConfigSchema.parse({});
  }

  private confirmationKey(
    tool: string,
    action: string,
    params?: Record<string, unknown>,
  ): string {
    // Create a deterministic key for the confirmation
    const paramStr = params !== undefined
      ? Object.entries(params)
          .filter(([k]) => k !== "confirm")
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${String(v)}`)
          .join("&")
      : "";
    return `${tool}.${action}:${paramStr}`;
  }

  private buildConfirmMessage(
    tool: string,
    action: string,
    params?: Record<string, unknown>,
  ): string {
    const paramPreview = params !== undefined
      ? Object.entries(params)
          .filter(([k]) => k !== "action" && k !== "confirm")
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(", ")
      : "";

    return (
      `CONFIRMATION REQUIRED: ${tool}.${action}` +
      (paramPreview.length > 0 ? ` (${paramPreview})` : "") +
      `. Call this tool again with confirm: true to proceed.`
    );
  }

  private buildDenyMessage(
    tool: string,
    action: string,
    tier: ActionTier,
  ): string {
    return (
      `DENIED: ${tool}.${action} is classified as "${tier}" and is denied by policy. ` +
      `To change this, add an override to your policy file (~/.front-mcp/policy.json): ` +
      `{ "overrides": [{ "tool": "${tool}", "action": "${action}", "decision": "confirm" }] }`
    );
  }
}
