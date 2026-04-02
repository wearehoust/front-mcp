import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { TeamsService } from "../../../src/services/teams.service.js";
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

const sampleTeam = {
  id: "team_123",
  name: "Support",
};

describe("TeamsService", () => {
  let service: TeamsService;

  beforeEach(() => {
    service = new TeamsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated teams from GET /teams", async () => {
      server.use(
        http.get(`${BASE}/teams`, () =>
          HttpResponse.json({ _results: [sampleTeam], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("team_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teams`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 10 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=10");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/teams`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleTeam],
              _pagination: { next: `${BASE}/teams?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleTeam, id: "team_456" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.list({ action: "list", auto_paginate: true });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("returns next_page_token when more pages exist", async () => {
      server.use(
        http.get(`${BASE}/teams`, () =>
          HttpResponse.json({
            _results: [sampleTeam],
            _pagination: { next: `${BASE}/teams?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("returns a team from GET /teams/{id}", async () => {
      server.use(
        http.get(`${BASE}/teams/team_123`, () => HttpResponse.json(sampleTeam)),
      );

      const result = await service.get({ action: "get", team_id: "team_123" });
      expect(result.id).toBe("team_123");
      expect(result.name).toBe("Support");
    });

    it("uses the correct team_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teams/team_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleTeam, id: "team_999" });
        }),
      );

      await service.get({ action: "get", team_id: "team_999" });
      expect(capturedUrl).toContain("/teams/team_999");
    });
  });

  // ---------------------------------------------------------------------------
  // addTeammates
  // ---------------------------------------------------------------------------
  describe("addTeammates", () => {
    it("sends POST /teams/{id}/teammates with teammate_ids", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teams/team_123/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addTeammates({
        action: "add_teammates",
        team_id: "team_123",
        teammate_ids: ["tea_1", "tea_2"],
      });
      expect(capturedUrl).toContain("/teams/team_123/teammates");
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1", "tea_2"] });
      expect(result).toEqual({});
    });

    it("uses the correct team_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${BASE}/teams/team_abc/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.addTeammates({
        action: "add_teammates",
        team_id: "team_abc",
        teammate_ids: ["tea_1"],
      });
      expect(capturedUrl).toContain("/teams/team_abc/teammates");
    });
  });

  // ---------------------------------------------------------------------------
  // removeTeammates
  // ---------------------------------------------------------------------------
  describe("removeTeammates", () => {
    it("sends DELETE /teams/{id}/teammates with teammate_ids in body", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/teams/team_123/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeTeammates({
        action: "remove_teammates",
        team_id: "team_123",
        teammate_ids: ["tea_1"],
      });
      expect(capturedUrl).toContain("/teams/team_123/teammates");
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1"] });
      expect(result).toEqual({});
    });

    it("uses the correct team_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/teams/team_xyz/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.removeTeammates({
        action: "remove_teammates",
        team_id: "team_xyz",
        teammate_ids: ["tea_3"],
      });
      expect(capturedUrl).toContain("/teams/team_xyz/teammates");
    });
  });
});
