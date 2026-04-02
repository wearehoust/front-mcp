import { describe, it, expect, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { TokenIdentityService } from "../../../src/services/token-identity.service.js";
import { FrontClient, ApiTokenAuth } from "../../../src/client/front-client.js";
import { RateLimiter } from "../../../src/client/rate-limiter.js";
import { Logger } from "../../../src/utils/logger.js";

function makeClient(): FrontClient {
  return new FrontClient(new ApiTokenAuth("test_token"), {
    rateLimiter: new RateLimiter(),
    logger: new Logger("error"),
    retryOptions: { maxRetries: 0 },
  });
}

describe("TokenIdentityService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gets current identity via GET /me", async () => {
    server.use(
      http.get("https://api2.frontapp.com/me", () => {
        return HttpResponse.json({
          id: "tea_123",
          email: "user@example.com",
          username: "testuser",
          first_name: "Test",
          last_name: "User",
        });
      }),
    );

    const service = new TokenIdentityService(makeClient());
    const result = await service.get();
    expect(result.id).toBe("tea_123");
    expect(result.email).toBe("user@example.com");
  });

  it("dispatches via execute method", async () => {
    server.use(
      http.get("https://api2.frontapp.com/me", () => {
        return HttpResponse.json({
          id: "tea_456",
          email: "test@example.com",
          username: "test",
          first_name: "A",
          last_name: "B",
        });
      }),
    );

    const service = new TokenIdentityService(makeClient());
    const result = await service.execute({ action: "get" }) as { id: string };
    expect(result.id).toBe("tea_456");
  });
});
