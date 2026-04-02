import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { EventsService } from "../../../src/services/events.service.js";
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

const sampleEvent = {
  id: "evt_123",
  type: "assign",
  emitted_at: 1700000000,
  source: { type: "teammate", data: { id: "tea_abc" } },
  target: { type: "conversation", data: { id: "cnv_xyz" } },
};

describe("EventsService", () => {
  let service: EventsService;

  beforeEach(() => {
    service = new EventsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated events from GET /events", async () => {
      server.use(
        http.get(`${BASE}/events`, () =>
          HttpResponse.json({ _results: [sampleEvent], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("evt_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/events`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "etok", limit: 50 });
      expect(capturedUrl).toContain("page_token=etok");
      expect(capturedUrl).toContain("limit=50");
    });

    it("passes types filter as query param", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/events`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", types: ["assign", "mention"] });
      expect(capturedUrl).toContain("types=assign%2Cmention");
    });

    it("passes before and after filters as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/events`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", before: 1700000100, after: 1699999900 });
      expect(capturedUrl).toContain("before=1700000100");
      expect(capturedUrl).toContain("after=1699999900");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/events`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          if (url.searchParams.get("page_token") === null) {
            return HttpResponse.json({
              _results: [sampleEvent],
              _pagination: { next: `${BASE}/events?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleEvent, id: "evt_456" }],
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
        http.get(`${BASE}/events`, () =>
          HttpResponse.json({
            _results: [sampleEvent],
            _pagination: { next: `${BASE}/events?page_token=enext` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("enext");
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("returns an event from GET /events/{id}", async () => {
      server.use(
        http.get(`${BASE}/events/evt_123`, () => HttpResponse.json(sampleEvent)),
      );

      const result = await service.get({ action: "get", event_id: "evt_123" });
      expect(result.id).toBe("evt_123");
      expect(result.type).toBe("assign");
    });

    it("uses the correct event_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/events/evt_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleEvent, id: "evt_999" });
        }),
      );

      await service.get({ action: "get", event_id: "evt_999" });
      expect(capturedUrl).toContain("/events/evt_999");
    });
  });
});
