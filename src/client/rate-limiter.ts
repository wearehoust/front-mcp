interface TierLimit {
  maxPerSecond: number;
  lastRequestAt: number;
}

interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number;
  burstLimit: number;
  burstRemaining: number;
  tierLimits: Map<string, TierLimit>;
}

const TIER_LIMITS: Record<string, number> = {
  analytics: 1,
  search: 0, // calculated as 40% of global rate
  conversations: 5,
  messages: 5,
};

export class RateLimiter {
  private state: RateLimitState;
  private proactiveDelayThreshold: number;

  constructor(proactiveDelayThreshold = 0.1) {
    this.proactiveDelayThreshold = proactiveDelayThreshold;
    this.state = {
      limit: 0,
      remaining: -1,
      resetAt: 0,
      burstLimit: 0,
      burstRemaining: 0,
      tierLimits: new Map(),
    };

    for (const [tier, maxPerSec] of Object.entries(TIER_LIMITS)) {
      this.state.tierLimits.set(tier, {
        maxPerSecond: maxPerSec,
        lastRequestAt: 0,
      });
    }
  }

  checkBeforeRequest(endpoint: string): number {
    const now = Date.now();

    // Check if we've passed the reset time
    if (this.state.resetAt > 0 && now >= this.state.resetAt * 1000) {
      this.state.remaining = this.state.limit;
      this.state.resetAt = 0;
    }

    // Proactive delay when remaining < threshold% of limit
    if (
      this.state.limit > 0 &&
      this.state.remaining >= 0 &&
      this.state.remaining < this.state.limit * this.proactiveDelayThreshold
    ) {
      const resetMs = this.state.resetAt * 1000;
      if (resetMs > now) {
        return resetMs - now;
      }
    }

    // Tier-specific limits
    const tier = this.getTier(endpoint);
    if (tier !== null) {
      const tierLimit = this.state.tierLimits.get(tier);
      if (tierLimit !== undefined && tierLimit.maxPerSecond > 0) {
        const minInterval = 1000 / tierLimit.maxPerSecond;
        const elapsed = now - tierLimit.lastRequestAt;
        if (elapsed < minInterval) {
          return minInterval - elapsed;
        }
      }

      // Search tier: 40% of global rate
      if (tier === "search" && this.state.limit > 0) {
        const searchLimit = Math.floor(this.state.limit * 0.4);
        if (this.state.remaining >= 0 && this.state.remaining < this.state.limit - searchLimit) {
          const resetMs = this.state.resetAt * 1000;
          if (resetMs > now) {
            return resetMs - now;
          }
        }
      }
    }

    return 0;
  }

  recordRequest(endpoint: string): void {
    const tier = this.getTier(endpoint);
    if (tier !== null) {
      const tierLimit = this.state.tierLimits.get(tier);
      if (tierLimit !== undefined) {
        tierLimit.lastRequestAt = Date.now();
      }
    }
  }

  updateFromResponse(headers: Headers): void {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    const burstLimit = headers.get("x-ratelimit-burst-limit");
    const burstRemaining = headers.get("x-ratelimit-burst-remaining");

    if (limit !== null) {
      this.state.limit = parseInt(limit, 10);
    }
    if (remaining !== null) {
      this.state.remaining = parseInt(remaining, 10);
    }
    if (reset !== null) {
      this.state.resetAt = parseInt(reset, 10);
    }
    if (burstLimit !== null) {
      this.state.burstLimit = parseInt(burstLimit, 10);
    }
    if (burstRemaining !== null) {
      this.state.burstRemaining = parseInt(burstRemaining, 10);
    }
  }

  getState(): Readonly<{
    limit: number;
    remaining: number;
    resetAt: number;
    burstLimit: number;
    burstRemaining: number;
  }> {
    return {
      limit: this.state.limit,
      remaining: this.state.remaining,
      resetAt: this.state.resetAt,
      burstLimit: this.state.burstLimit,
      burstRemaining: this.state.burstRemaining,
    };
  }

  private getTier(endpoint: string): string | null {
    if (endpoint.includes("/analytics")) return "analytics";
    if (endpoint.includes("/search")) return "search";
    if (endpoint.includes("/conversations")) return "conversations";
    if (endpoint.includes("/messages")) return "messages";
    return null;
  }
}
