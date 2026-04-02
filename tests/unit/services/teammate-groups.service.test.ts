import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { TeammateGroupsService } from "../../../src/services/teammate-groups.service.js";
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

const sampleGroup = { id: "grp_123", name: "Support Team" };
const sampleInbox = { id: "inb_1", name: "Support Inbox" };
const sampleTeammate = {
  id: "tea_1",
  email: "alice@example.com",
  username: "alice",
  first_name: "Alice",
  last_name: "Smith",
};
const sampleTeam = { id: "team_1", name: "Sales" };

describe("TeammateGroupsService", () => {
  let service: TeammateGroupsService;

  beforeEach(() => {
    service = new TeammateGroupsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated groups from GET /teammate_groups", async () => {
      server.use(
        http.get(`${BASE}/teammate_groups`, () =>
          HttpResponse.json({ _results: [sampleGroup], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("grp_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammate_groups`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 20 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=20");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/teammate_groups`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleGroup],
              _pagination: { next: `${BASE}/teammate_groups?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleGroup, id: "grp_456" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.list({ action: "list", auto_paginate: true });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("returns a group from GET /teammate_groups/{id}", async () => {
      server.use(
        http.get(`${BASE}/teammate_groups/grp_123`, () => HttpResponse.json(sampleGroup)),
      );

      const result = await service.get({ action: "get", group_id: "grp_123" });
      expect(result.id).toBe("grp_123");
      expect(result.name).toBe("Support Team");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("sends POST /teammate_groups with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teammate_groups`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleGroup, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "Support Team" });
      expect(capturedBody).toMatchObject({ name: "Support Team" });
      expect(result.id).toBe("grp_123");
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("sends PATCH /teammate_groups/{id} with updated name", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/teammate_groups/grp_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleGroup, name: "New Name" });
        }),
      );

      const result = await service.update({
        action: "update",
        group_id: "grp_123",
        name: "New Name",
      });
      expect(capturedBody).toMatchObject({ name: "New Name" });
      expect(result.name).toBe("New Name");
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe("delete", () => {
    it("sends DELETE /teammate_groups/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/teammate_groups/grp_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", group_id: "grp_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // listInboxes
  // ---------------------------------------------------------------------------
  describe("listInboxes", () => {
    it("returns inboxes from GET /teammate_groups/{id}/inboxes", async () => {
      server.use(
        http.get(`${BASE}/teammate_groups/grp_123/inboxes`, () =>
          HttpResponse.json({ _results: [sampleInbox], _pagination: {} }),
        ),
      );

      const result = await service.listInboxes({
        action: "list_inboxes",
        group_id: "grp_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("inb_1");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammate_groups/grp_123/inboxes`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listInboxes({
        action: "list_inboxes",
        group_id: "grp_123",
        page_token: "tok_p2",
        limit: 5,
      });
      expect(capturedUrl).toContain("page_token=tok_p2");
      expect(capturedUrl).toContain("limit=5");
    });
  });

  // ---------------------------------------------------------------------------
  // addInboxes
  // ---------------------------------------------------------------------------
  describe("addInboxes", () => {
    it("sends POST /teammate_groups/{id}/inboxes with inbox_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teammate_groups/grp_123/inboxes`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addInboxes({
        action: "add_inboxes",
        group_id: "grp_123",
        inbox_ids: ["inb_1", "inb_2"],
      });
      expect(capturedBody).toMatchObject({ inbox_ids: ["inb_1", "inb_2"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // removeInboxes
  // ---------------------------------------------------------------------------
  describe("removeInboxes", () => {
    it("sends DELETE /teammate_groups/{id}/inboxes with inbox_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/teammate_groups/grp_123/inboxes`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeInboxes({
        action: "remove_inboxes",
        group_id: "grp_123",
        inbox_ids: ["inb_1"],
      });
      expect(capturedBody).toMatchObject({ inbox_ids: ["inb_1"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // listTeammates
  // ---------------------------------------------------------------------------
  describe("listTeammates", () => {
    it("returns teammates from GET /teammate_groups/{id}/teammates", async () => {
      server.use(
        http.get(`${BASE}/teammate_groups/grp_123/teammates`, () =>
          HttpResponse.json({ _results: [sampleTeammate], _pagination: {} }),
        ),
      );

      const result = await service.listTeammates({
        action: "list_teammates",
        group_id: "grp_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tea_1");
    });
  });

  // ---------------------------------------------------------------------------
  // addTeammates
  // ---------------------------------------------------------------------------
  describe("addTeammates", () => {
    it("sends POST /teammate_groups/{id}/teammates with teammate_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teammate_groups/grp_123/teammates`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addTeammates({
        action: "add_teammates",
        group_id: "grp_123",
        teammate_ids: ["tea_1"],
      });
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // removeTeammates
  // ---------------------------------------------------------------------------
  describe("removeTeammates", () => {
    it("sends DELETE /teammate_groups/{id}/teammates with teammate_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/teammate_groups/grp_123/teammates`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeTeammates({
        action: "remove_teammates",
        group_id: "grp_123",
        teammate_ids: ["tea_2"],
      });
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_2"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // listTeams
  // ---------------------------------------------------------------------------
  describe("listTeams", () => {
    it("returns teams from GET /teammate_groups/{id}/teams", async () => {
      server.use(
        http.get(`${BASE}/teammate_groups/grp_123/teams`, () =>
          HttpResponse.json({ _results: [sampleTeam], _pagination: {} }),
        ),
      );

      const result = await service.listTeams({
        action: "list_teams",
        group_id: "grp_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("team_1");
    });
  });

  // ---------------------------------------------------------------------------
  // addTeams
  // ---------------------------------------------------------------------------
  describe("addTeams", () => {
    it("sends POST /teammate_groups/{id}/teams with team_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teammate_groups/grp_123/teams`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addTeams({
        action: "add_teams",
        group_id: "grp_123",
        team_ids: ["team_1"],
      });
      expect(capturedBody).toMatchObject({ team_ids: ["team_1"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // removeTeams
  // ---------------------------------------------------------------------------
  describe("removeTeams", () => {
    it("sends DELETE /teammate_groups/{id}/teams with team_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/teammate_groups/grp_123/teams`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeTeams({
        action: "remove_teams",
        group_id: "grp_123",
        team_ids: ["team_2"],
      });
      expect(capturedBody).toMatchObject({ team_ids: ["team_2"] });
      expect(result).toEqual({});
    });
  });
});
