import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withRetry,
  FrontApiError,
  NetworkError,
} from "../../../src/client/retry.js";

describe("Retry Engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FrontApiError("rate limited", 429, "Too Many Requests"))
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, { backoffBaseMs: 10, backoffMaxMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 server errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FrontApiError("server error", 500, "Internal Server Error"))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, { backoffBaseMs: 10, backoffMaxMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on network errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError("connection reset"))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, { backoffBaseMs: 10, backoffMaxMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
  });

  it("does NOT retry on 400 bad request", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new FrontApiError("bad request", 400, "Bad Request"));

    await expect(withRetry(fn)).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 401 unauthorized", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new FrontApiError("unauthorized", 401, "Unauthorized"));

    await expect(withRetry(fn)).rejects.toThrow("unauthorized");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 403 forbidden", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new FrontApiError("forbidden", 403, "Forbidden"));

    await expect(withRetry(fn)).rejects.toThrow("forbidden");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 404 not found", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new FrontApiError("not found", 404, "Not Found"));

    await expect(withRetry(fn)).rejects.toThrow("not found");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops after max retries and throws last error", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new FrontApiError("rate limited", 429, "Too Many Requests"));

    vi.useRealTimers();
    await expect(
      withRetry(fn, {
        maxRetries: 2,
        backoffBaseMs: 1,
        backoffMaxMs: 5,
      }),
    ).rejects.toThrow("rate limited");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    vi.useFakeTimers();
  });

  it("respects retry-after header", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new FrontApiError("rate limited", 429, "Too Many Requests", 5),
      )
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, { backoffBaseMs: 10, backoffMaxMs: 100000 });

    // The retry-after is 5 seconds = 5000ms, which should be used instead of backoff
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 502, 503, 504", async () => {
    for (const status of [502, 503, 504]) {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new FrontApiError(`error ${status}`, status, `Error ${status}`),
        )
        .mockResolvedValueOnce("ok");

      const promise = withRetry(fn, { backoffBaseMs: 10, backoffMaxMs: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe("ok");
    }
  });
});
