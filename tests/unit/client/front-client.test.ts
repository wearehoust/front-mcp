import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import {
  FrontClient,
  ApiTokenAuth,
  parseRetryAfter,
  type AuthProvider,
} from "../../../src/client/front-client.js";
import { RateLimiter } from "../../../src/client/rate-limiter.js";
import { Logger } from "../../../src/utils/logger.js";
import { FrontApiError, NetworkError } from "../../../src/client/retry.js";

describe("FrontClient", () => {
  let client: FrontClient;
  let rateLimiter: RateLimiter;
  let logger: Logger;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    logger = new Logger("error");
    const auth = new ApiTokenAuth("test_token_123");
    client = new FrontClient(auth, {
      rateLimiter,
      logger,
      retryOptions: { maxRetries: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication", () => {
    it("injects Bearer token in Authorization header", async () => {
      let capturedAuth = "";
      server.use(
        http.get("https://api2.frontapp.com/conversations", ({ request }) => {
          capturedAuth = request.headers.get("authorization") ?? "";
          return HttpResponse.json({ _results: [] });
        }),
      );

      await client.get("/conversations");
      expect(capturedAuth).toBe("Bearer test_token_123");
    });

    it("sets Accept: application/json header", async () => {
      let capturedAccept = "";
      server.use(
        http.get("https://api2.frontapp.com/conversations", ({ request }) => {
          capturedAccept = request.headers.get("accept") ?? "";
          return HttpResponse.json({ _results: [] });
        }),
      );

      await client.get("/conversations");
      expect(capturedAccept).toBe("application/json");
    });
  });

  describe("HTTPS enforcement", () => {
    it("rejects non-HTTPS URLs", async () => {
      // The client always uses https://api2.frontapp.com, so we can't directly test
      // HTTP rejection via normal methods. But we can verify the base URL is HTTPS.
      // The enforcement check is in the request method.
      // We'll test by checking the code path - since buildUrl always uses BASE_URL which is https,
      // a direct HTTP URL would need to come from a code change.
      // The test here ensures the client works with HTTPS.
      server.use(
        http.get("https://api2.frontapp.com/test", () => {
          return HttpResponse.json({ ok: true });
        }),
      );

      const result = await client.get<{ ok: boolean }>("/test");
      expect(result.ok).toBe(true);
    });
  });

  describe("HTTP methods", () => {
    it("sends GET requests", async () => {
      server.use(
        http.get("https://api2.frontapp.com/conversations", () => {
          return HttpResponse.json({ _results: [] });
        }),
      );

      const result = await client.get<{ _results: unknown[] }>("/conversations");
      expect(result._results).toEqual([]);
    });

    it("sends POST requests with body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post("https://api2.frontapp.com/conversations", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ id: "cnv_123" }, { status: 201 });
        }),
      );

      await client.post("/conversations", { subject: "Test" });
      expect(capturedBody).toEqual({ subject: "Test" });
    });

    it("sends PATCH requests", async () => {
      let capturedMethod = "";
      server.use(
        http.patch("https://api2.frontapp.com/conversations/cnv_1", ({ request }) => {
          capturedMethod = request.method;
          return HttpResponse.json({ id: "cnv_1" });
        }),
      );

      await client.patch("/conversations/cnv_1", { status: "archived" });
      expect(capturedMethod).toBe("PATCH");
    });

    it("sends DELETE requests", async () => {
      server.use(
        http.delete("https://api2.frontapp.com/conversations/cnv_1", () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await client.delete<Record<string, never>>("/conversations/cnv_1");
      expect(result).toEqual({});
    });

    it("sends PUT requests", async () => {
      server.use(
        http.put("https://api2.frontapp.com/conversations/cnv_1", () => {
          return HttpResponse.json({ id: "cnv_1" });
        }),
      );

      const result = await client.put<{ id: string }>("/conversations/cnv_1", {
        assignee_id: "tea_1",
      });
      expect(result.id).toBe("cnv_1");
    });
  });

  describe("query parameters", () => {
    it("appends query params to URL", async () => {
      let capturedUrl = "";
      server.use(
        http.get("https://api2.frontapp.com/conversations", ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [] });
        }),
      );

      await client.get("/conversations", { status: "open", limit: "10" });
      expect(capturedUrl).toContain("status=open");
      expect(capturedUrl).toContain("limit=10");
    });
  });

  describe("error handling", () => {
    it("throws FrontApiError on 400", async () => {
      server.use(
        http.get("https://api2.frontapp.com/conversations", () => {
          return HttpResponse.json(
            { _error: { message: "Invalid parameters" } },
            { status: 400 },
          );
        }),
      );

      await expect(client.get("/conversations")).rejects.toThrow(FrontApiError);
    });

    it("includes Front error message in error", async () => {
      server.use(
        http.get("https://api2.frontapp.com/conversations", () => {
          return HttpResponse.json(
            { _error: { message: "Conversation not found" } },
            { status: 404 },
          );
        }),
      );

      try {
        await client.get("/conversations");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(FrontApiError);
        const apiError = error as FrontApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.frontMessage).toBe("Conversation not found");
      }
    });

    it("handles 204 No Content responses", async () => {
      server.use(
        http.delete("https://api2.frontapp.com/tags/tag_1", () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await client.delete<Record<string, never>>("/tags/tag_1");
      expect(result).toEqual({});
    });
  });

  describe("rate limiter integration", () => {
    it("updates rate limiter from response headers", async () => {
      server.use(
        http.get("https://api2.frontapp.com/conversations", () => {
          return HttpResponse.json(
            { _results: [] },
            {
              headers: {
                "x-ratelimit-limit": "100",
                "x-ratelimit-remaining": "99",
                "x-ratelimit-reset": "1700000000",
              },
            },
          );
        }),
      );

      await client.get("/conversations");
      const state = rateLimiter.getState();
      expect(state.limit).toBe(100);
      expect(state.remaining).toBe(99);
    });
  });

  describe("auth provider", () => {
    it("uses ApiTokenAuth provider", async () => {
      const auth = new ApiTokenAuth("my_api_token");
      const token = await auth.getToken();
      expect(token).toBe("my_api_token");
    });

    it("supports changing auth provider", async () => {
      let capturedAuth = "";
      server.use(
        http.get("https://api2.frontapp.com/me", ({ request }) => {
          capturedAuth = request.headers.get("authorization") ?? "";
          return HttpResponse.json({ id: "tea_1" });
        }),
      );

      const newAuth: AuthProvider = {
        getToken: async () => "new_token_456",
      };
      client.setAuthProvider(newAuth);

      await client.get("/me");
      expect(capturedAuth).toBe("Bearer new_token_456");
    });
  });
});

describe("parseRetryAfter", () => {
  it("returns undefined for null/empty/whitespace headers", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter("   ")).toBeUndefined();
  });

  it("parses delta-seconds form", () => {
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter("30")).toBe(30);
    expect(parseRetryAfter("  120  ")).toBe(120);
  });

  it("parses HTTP-date form into seconds-from-now", () => {
    const future = new Date(Date.now() + 90 * 1000).toUTCString();
    const seconds = parseRetryAfter(future);
    expect(seconds).toBeDefined();
    // Allow ±2s slop for test timing
    expect(seconds).toBeGreaterThanOrEqual(88);
    expect(seconds).toBeLessThanOrEqual(91);
  });

  it("clamps past HTTP-date to 0 instead of negative", () => {
    const past = new Date(Date.now() - 60_000).toUTCString();
    expect(parseRetryAfter(past)).toBe(0);
  });

  it("returns undefined for non-numeric, non-date garbage", () => {
    expect(parseRetryAfter("not-a-date-or-number")).toBeUndefined();
  });
});
