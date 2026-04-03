import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { RulesService } from "../../../src/services/rules.service.js";
import { FrontClient, ApiTokenAuth } from "../../../src/client/front-client.js";
import { RateLimiter } from "../../../src/client/rate-limiter.js";
import { Logger } from "../../../src/utils/logger.js";

const BASE = "https://api2.frontapp.com";

function makeClient(): FrontClient {
  return new FrontClient(new ApiTokenAuth("test_token"), {
    rateLimiter: new RateLimiter(),
    logger: new Logger("error"),
    retryOptions: { maxRetries: 0 },
  });
}

const sampleRule = {
  id: "rul_123",
  name: "Auto-assign VIP",
  is_private: false,
  actions: [{ type: "assign", value: "teammate_1" }],
};

describe("RulesService", () => {
  let service: RulesService;

  beforeEach(() => {
    service = new RulesService(makeClient());
  });

  describe("list", () => {
    it("returns rules from GET /rules", async () => {
      server.use(
        http.get(`${BASE}/rules`, () =>
          HttpResponse.json({ _results: [sampleRule] }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("rul_123");
    });

    it("returns empty results when no rules exist", async () => {
      server.use(
        http.get(`${BASE}/rules`, () =>
          HttpResponse.json({ _results: [] }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(0);
    });

    it("handles missing _results field gracefully", async () => {
      server.use(
        http.get(`${BASE}/rules`, () =>
          HttpResponse.json({}),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toEqual([]);
    });
  });

  describe("get", () => {
    it("returns a rule from GET /rules/{id}", async () => {
      server.use(
        http.get(`${BASE}/rules/rul_123`, () => HttpResponse.json(sampleRule)),
      );

      const result = await service.get({ action: "get", rule_id: "rul_123" });
      expect(result.id).toBe("rul_123");
      expect(result.name).toBe("Auto-assign VIP");
    });

    it("uses the correct rule_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/rules/rul_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleRule, id: "rul_999" });
        }),
      );

      await service.get({ action: "get", rule_id: "rul_999" });
      expect(capturedUrl).toContain("/rules/rul_999");
    });
  });

  describe("listForTeammate", () => {
    it("returns rules from GET /teammates/{id}/rules", async () => {
      server.use(
        http.get(`${BASE}/teammates/tea_123/rules`, () =>
          HttpResponse.json({ _results: [sampleRule] }),
        ),
      );

      const result = await service.listForTeammate({ action: "list_for_teammate", teammate_id: "tea_123" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("rul_123");
    });

    it("uses the correct teammate_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates/tea_xyz/rules`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [] });
        }),
      );

      await service.listForTeammate({ action: "list_for_teammate", teammate_id: "tea_xyz" });
      expect(capturedUrl).toContain("/teammates/tea_xyz/rules");
    });
  });

  describe("listForTeam", () => {
    it("returns rules from GET /teams/{id}/rules", async () => {
      server.use(
        http.get(`${BASE}/teams/grp_123/rules`, () =>
          HttpResponse.json({ _results: [sampleRule] }),
        ),
      );

      const result = await service.listForTeam({ action: "list_for_team", team_id: "grp_123" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("rul_123");
    });

    it("uses the correct team_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teams/grp_xyz/rules`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [] });
        }),
      );

      await service.listForTeam({ action: "list_for_team", team_id: "grp_xyz" });
      expect(capturedUrl).toContain("/teams/grp_xyz/rules");
    });
  });
});
