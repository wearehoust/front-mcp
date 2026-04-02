import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../../../src/client/rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("header parsing", () => {
    it("parses all 5 rate limit headers", () => {
      const limiter = new RateLimiter();
      const headers = new Headers({
        "x-ratelimit-limit": "100",
        "x-ratelimit-remaining": "95",
        "x-ratelimit-reset": "1700000000",
        "x-ratelimit-burst-limit": "50",
        "x-ratelimit-burst-remaining": "48",
      });

      limiter.updateFromResponse(headers);
      const state = limiter.getState();

      expect(state.limit).toBe(100);
      expect(state.remaining).toBe(95);
      expect(state.resetAt).toBe(1700000000);
      expect(state.burstLimit).toBe(50);
      expect(state.burstRemaining).toBe(48);
    });

    it("handles missing headers gracefully", () => {
      const limiter = new RateLimiter();
      const headers = new Headers({
        "x-ratelimit-limit": "100",
      });

      limiter.updateFromResponse(headers);
      const state = limiter.getState();

      expect(state.limit).toBe(100);
      expect(state.remaining).toBe(-1);
    });
  });

  describe("proactive delay", () => {
    it("returns delay when remaining is below threshold", () => {
      const limiter = new RateLimiter(0.1);
      const now = Date.now();
      const resetTime = Math.floor(now / 1000) + 30;

      limiter.updateFromResponse(
        new Headers({
          "x-ratelimit-limit": "100",
          "x-ratelimit-remaining": "5",
          "x-ratelimit-reset": String(resetTime),
        }),
      );

      const delay = limiter.checkBeforeRequest("/conversations");
      expect(delay).toBeGreaterThan(0);
    });

    it("returns 0 when remaining is above threshold", () => {
      const limiter = new RateLimiter(0.1);

      limiter.updateFromResponse(
        new Headers({
          "x-ratelimit-limit": "100",
          "x-ratelimit-remaining": "50",
          "x-ratelimit-reset": "9999999999",
        }),
      );

      const delay = limiter.checkBeforeRequest("/conversations");
      expect(delay).toBe(0);
    });

    it("returns 0 when no rate limit info is available", () => {
      const limiter = new RateLimiter();
      const delay = limiter.checkBeforeRequest("/conversations");
      expect(delay).toBe(0);
    });
  });

  describe("tier-specific limits", () => {
    it("enforces analytics rate limit of 1 per second", () => {
      const limiter = new RateLimiter();

      limiter.recordRequest("/analytics/exports");
      vi.advanceTimersByTime(500);
      const delay = limiter.checkBeforeRequest("/analytics/exports");

      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(500);
    });

    it("allows analytics request after 1 second", () => {
      const limiter = new RateLimiter();

      limiter.recordRequest("/analytics/exports");
      vi.advanceTimersByTime(1001);
      const delay = limiter.checkBeforeRequest("/analytics/exports");

      expect(delay).toBe(0);
    });

    it("enforces conversations rate limit of 5 per second", () => {
      const limiter = new RateLimiter();

      limiter.recordRequest("/conversations");
      vi.advanceTimersByTime(100);
      const delay = limiter.checkBeforeRequest("/conversations");

      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(100);
    });

    it("does not limit non-tiered endpoints", () => {
      const limiter = new RateLimiter();

      limiter.recordRequest("/tags");
      const delay = limiter.checkBeforeRequest("/tags");
      expect(delay).toBe(0);
    });
  });

  describe("reset behavior", () => {
    it("resets remaining count after reset time passes", () => {
      const limiter = new RateLimiter(0.1);
      const now = Date.now();
      const resetTime = Math.floor(now / 1000) + 1;

      limiter.updateFromResponse(
        new Headers({
          "x-ratelimit-limit": "100",
          "x-ratelimit-remaining": "1",
          "x-ratelimit-reset": String(resetTime),
        }),
      );

      vi.advanceTimersByTime(2000);
      const delay = limiter.checkBeforeRequest("/conversations");
      expect(delay).toBe(0);
    });
  });
});
