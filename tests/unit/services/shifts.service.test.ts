import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { ShiftsService } from "../../../src/services/shifts.service.js";
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

const sampleShift = {
  id: "shf_123",
  name: "Morning Shift",
  color: "blue",
  timezone: "America/New_York",
  times: { monday: { start: "09:00", end: "17:00" } },
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleTeammate = {
  id: "tea_1",
  email: "alice@example.com",
  username: "alice",
  first_name: "Alice",
  last_name: "Smith",
};

describe("ShiftsService", () => {
  let service: ShiftsService;

  beforeEach(() => {
    service = new ShiftsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated shifts from GET /shifts", async () => {
      server.use(
        http.get(`${BASE}/shifts`, () =>
          HttpResponse.json({ _results: [sampleShift], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("shf_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/shifts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 25 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=25");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/shifts`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleShift],
              _pagination: { next: `${BASE}/shifts?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleShift, id: "shf_456" }],
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
        http.get(`${BASE}/shifts`, () =>
          HttpResponse.json({
            _results: [sampleShift],
            _pagination: { next: `${BASE}/shifts?page_token=next_tok` },
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
    it("returns a shift from GET /shifts/{id}", async () => {
      server.use(
        http.get(`${BASE}/shifts/shf_123`, () => HttpResponse.json(sampleShift)),
      );

      const result = await service.get({ action: "get", shift_id: "shf_123" });
      expect(result.id).toBe("shf_123");
      expect(result.name).toBe("Morning Shift");
    });

    it("uses the correct shift_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/shifts/shf_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleShift, id: "shf_999" });
        }),
      );

      await service.get({ action: "get", shift_id: "shf_999" });
      expect(capturedUrl).toContain("/shifts/shf_999");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("sends POST /shifts with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/shifts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleShift, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "Morning Shift" });
      expect(capturedBody).toMatchObject({ name: "Morning Shift" });
      expect(result.id).toBe("shf_123");
    });

    it("includes optional color, timezone, times when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/shifts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleShift, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        name: "Morning Shift",
        color: "blue",
        timezone: "America/New_York",
        times: { monday: { start: "09:00", end: "17:00" } },
      });
      expect(capturedBody).toMatchObject({
        name: "Morning Shift",
        color: "blue",
        timezone: "America/New_York",
        times: { monday: { start: "09:00", end: "17:00" } },
      });
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/shifts`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleShift, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Morning Shift" });
      expect(Object.keys(capturedBody)).toEqual(["name"]);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("sends PATCH /shifts/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/shifts/shf_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleShift, name: "Evening Shift" });
        }),
      );

      const result = await service.update({
        action: "update",
        shift_id: "shf_123",
        name: "Evening Shift",
      });
      expect(capturedBody).toMatchObject({ name: "Evening Shift" });
      expect(result.name).toBe("Evening Shift");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/shifts/shf_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleShift);
        }),
      );

      await service.update({ action: "update", shift_id: "shf_123", color: "red" });
      expect(capturedBody).toEqual({ color: "red" });
    });
  });

  // ---------------------------------------------------------------------------
  // listTeammates
  // ---------------------------------------------------------------------------
  describe("listTeammates", () => {
    it("returns teammates from GET /shifts/{id}/teammates", async () => {
      server.use(
        http.get(`${BASE}/shifts/shf_123/teammates`, () =>
          HttpResponse.json({ _results: [sampleTeammate], _pagination: {} }),
        ),
      );

      const result = await service.listTeammates({
        action: "list_teammates",
        shift_id: "shf_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tea_1");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/shifts/shf_123/teammates`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listTeammates({
        action: "list_teammates",
        shift_id: "shf_123",
        page_token: "tok_p2",
        limit: 10,
      });
      expect(capturedUrl).toContain("page_token=tok_p2");
      expect(capturedUrl).toContain("limit=10");
    });
  });

  // ---------------------------------------------------------------------------
  // addTeammates
  // ---------------------------------------------------------------------------
  describe("addTeammates", () => {
    it("sends POST /shifts/{id}/teammates with teammate_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/shifts/shf_123/teammates`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addTeammates({
        action: "add_teammates",
        shift_id: "shf_123",
        teammate_ids: ["tea_1", "tea_2"],
      });
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1", "tea_2"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // removeTeammates
  // ---------------------------------------------------------------------------
  describe("removeTeammates", () => {
    it("sends DELETE /shifts/{id}/teammates with teammate_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/shifts/shf_123/teammates`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeTeammates({
        action: "remove_teammates",
        shift_id: "shf_123",
        teammate_ids: ["tea_1"],
      });
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1"] });
      expect(result).toEqual({});
    });

    it("uses the correct shift_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/shifts/shf_xyz/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.removeTeammates({
        action: "remove_teammates",
        shift_id: "shf_xyz",
        teammate_ids: ["tea_3"],
      });
      expect(capturedUrl).toContain("/shifts/shf_xyz/teammates");
    });
  });
});
