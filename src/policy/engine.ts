import { readFileSync, existsSync } from "node:fs";
import { getActionTier } from "./default-policy.js";
import {
  PolicyConfigSchema,
  type PolicyConfig,
  type PolicyDecision,
  type PolicyEvaluation,
  type ActionTier,
} from "./types.js";

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`);
  return `{${entries.join(",")}}`;
}

const DEFAULT_DECISIONS: Record<ActionTier, PolicyDecision> = {
  read: "allow",
  write: "confirm",
  destructive: "deny",
};

const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes
// Hard ceiling on the pending-confirmations map. A long-running server that
// receives many distinct confirm-tier calls would otherwise grow this map
// without bound (TTL pruning happens lazily on evaluate()).
const MAX_PENDING_CONFIRMATIONS = 1000;

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
      this.pruneExpiredConfirmations();

      const confirmParam = params?.["confirm"];
      if (confirmParam === true) {
        // Only allow if there's a valid pending confirmation from a prior call
        const key = this.confirmationKey(tool, action, params);
        const pending = this.pendingConfirmations.get(key);
        if (pending !== undefined && pending.expiresAt > Date.now()) {
          this.pendingConfirmations.delete(key);
          return { decision: "allow", tier };
        }
        // No valid pending confirmation — reject the bypass attempt
      }

      // Store pending confirmation and require a second call
      const key = this.confirmationKey(tool, action, params);
      // FIFO eviction if we somehow exceed the cap even after pruning. Map
      // iteration order in JS is insertion order, so the first key is oldest.
      while (this.pendingConfirmations.size >= MAX_PENDING_CONFIRMATIONS) {
        const oldest = this.pendingConfirmations.keys().next().value;
        if (oldest === undefined) break;
        this.pendingConfirmations.delete(oldest);
      }
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

  private pruneExpiredConfirmations(): void {
    const now = Date.now();
    for (const [key, pending] of this.pendingConfirmations) {
      if (pending.expiresAt <= now) {
        this.pendingConfirmations.delete(key);
      }
    }
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
    // Canonicalize params so the key is invariant under property ordering.
    // String(v) collapsed objects to "[object Object]" — every distinct call
    // with object args mapped to the same key, so the second `confirm: true`
    // call could match a different operation's pending confirmation.
    if (params === undefined) {
      return `${tool}.${action}:`;
    }
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k !== "confirm") filtered[k] = v;
    }
    return `${tool}.${action}:${canonicalStringify(filtered)}`;
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
