import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { TeammatesService } from "../../../src/services/teammates.service.js";
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

const sampleTeammate = {
  id: "tea_123",
  email: "alice@example.com",
  username: "alice",
  first_name: "Alice",
  last_name: "Smith",
  is_available: true,
  custom_fields: {},
};

const sampleConversation = {
  id: "cnv_1",
  subject: "Help needed",
  status: "open",
};

const sampleInbox = {
  id: "inb_1",
  name: "Support",
};

describe("TeammatesService", () => {
  let service: TeammatesService;

  beforeEach(() => {
    service = new TeammatesService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated teammates from GET /teammates", async () => {
      server.use(
        http.get(`${BASE}/teammates`, () =>
          HttpResponse.json({ _results: [sampleTeammate], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tea_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 50 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=50");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/teammates`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleTeammate],
              _pagination: { next: `${BASE}/teammates?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleTeammate, id: "tea_456" }],
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
        http.get(`${BASE}/teammates`, () =>
          HttpResponse.json({
            _results: [sampleTeammate],
            _pagination: { next: `${BASE}/teammates?page_token=next_tok` },
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
    it("returns a teammate from GET /teammates/{id}", async () => {
      server.use(
        http.get(`${BASE}/teammates/tea_123`, () => HttpResponse.json(sampleTeammate)),
      );

      const result = await service.get({ action: "get", teammate_id: "tea_123" });
      expect(result.id).toBe("tea_123");
      expect(result.email).toBe("alice@example.com");
    });

    it("uses the correct teammate_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates/tea_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleTeammate, id: "tea_999" });
        }),
      );

      await service.get({ action: "get", teammate_id: "tea_999" });
      expect(capturedUrl).toContain("/teammates/tea_999");
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("sends PATCH /teammates/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/teammates/tea_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleTeammate, first_name: "Bob" });
        }),
      );

      const result = await service.update({
        action: "update",
        teammate_id: "tea_123",
        first_name: "Bob",
      });
      expect(capturedBody).toMatchObject({ first_name: "Bob" });
      expect(result.first_name).toBe("Bob");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/teammates/tea_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleTeammate);
        }),
      );

      await service.update({
        action: "update",
        teammate_id: "tea_123",
        is_available: false,
      });
      expect(capturedBody).toEqual({ is_available: false });
    });

    it("includes custom_fields when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/teammates/tea_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleTeammate);
        }),
      );

      await service.update({
        action: "update",
        teammate_id: "tea_123",
        custom_fields: { department: "Engineering" },
      });
      expect(capturedBody).toMatchObject({ custom_fields: { department: "Engineering" } });
    });
  });

  // ---------------------------------------------------------------------------
  // listConversations
  // ---------------------------------------------------------------------------
  describe("listConversations", () => {
    it("returns conversations from GET /teammates/{id}/conversations", async () => {
      server.use(
        http.get(`${BASE}/teammates/tea_123/conversations`, () =>
          HttpResponse.json({ _results: [sampleConversation], _pagination: {} }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        teammate_id: "tea_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cnv_1");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates/tea_123/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listConversations({
        action: "list_conversations",
        teammate_id: "tea_123",
        page_token: "tok_conv",
        limit: 25,
      });
      expect(capturedUrl).toContain("page_token=tok_conv");
      expect(capturedUrl).toContain("limit=25");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/teammates/tea_123/conversations`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleConversation],
              _pagination: { next: `${BASE}/teammates/tea_123/conversations?page_token=p2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleConversation, id: "cnv_2" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        teammate_id: "tea_123",
        auto_paginate: true,
      });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("returns next_page_token when more conversations exist", async () => {
      server.use(
        http.get(`${BASE}/teammates/tea_123/conversations`, () =>
          HttpResponse.json({
            _results: [sampleConversation],
            _pagination: { next: `${BASE}/teammates/tea_123/conversations?page_token=conv_next` },
          }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        teammate_id: "tea_123",
      });
      expect(result.next_page_token).toBe("conv_next");
    });
  });

  // ---------------------------------------------------------------------------
  // listInboxes
  // ---------------------------------------------------------------------------
  describe("listInboxes", () => {
    it("returns inboxes from GET /teammates/{id}/inboxes", async () => {
      server.use(
        http.get(`${BASE}/teammates/tea_123/inboxes`, () =>
          HttpResponse.json({ _results: [sampleInbox], _pagination: {} }),
        ),
      );

      const result = await service.listInboxes({
        action: "list_inboxes",
        teammate_id: "tea_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("inb_1");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates/tea_123/inboxes`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listInboxes({
        action: "list_inboxes",
        teammate_id: "tea_123",
        page_token: "tok_inb",
        limit: 15,
      });
      expect(capturedUrl).toContain("page_token=tok_inb");
      expect(capturedUrl).toContain("limit=15");
    });

    it("uses the correct teammate_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates/tea_abc/inboxes`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listInboxes({
        action: "list_inboxes",
        teammate_id: "tea_abc",
      });
      expect(capturedUrl).toContain("/teammates/tea_abc/inboxes");
    });
  });
});
