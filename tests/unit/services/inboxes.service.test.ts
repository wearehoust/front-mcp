import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { FrontClient, ApiTokenAuth } from "../../../src/client/front-client.js";
import { RateLimiter } from "../../../src/client/rate-limiter.js";
import { Logger } from "../../../src/utils/logger.js";
import { InboxesService } from "../../../src/services/inboxes.service.js";

function makeClient(): FrontClient {
  return new FrontClient(new ApiTokenAuth("test_token"), {
    rateLimiter: new RateLimiter(),
    logger: new Logger("error"),
    retryOptions: { maxRetries: 0 },
  });
}

const BASE = "https://api2.frontapp.com";

const stubInbox = {
  id: "inb_123",
  name: "Support",
  address: "support@example.com",
  send_as: null,
  custom_fields: {},
  is_private: false,
};

const stubChannel = {
  id: "cha_1",
  name: "Email",
  address: "support@example.com",
  type: "smtp",
  send_as: null,
};

const stubConversation = {
  id: "cnv_1",
  subject: "Hello",
  status: "open",
};

const stubTeammate = {
  id: "tea_1",
  email: "alice@example.com",
  username: "alice",
  first_name: "Alice",
  last_name: "Smith",
};

describe("InboxesService", () => {
  let service: InboxesService;

  beforeEach(() => {
    service = new InboxesService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("calls GET /inboxes and returns paginated results", async () => {
      server.use(
        http.get(`${BASE}/inboxes`, () =>
          HttpResponse.json({ _results: [stubInbox], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("inb_123");
    });

    it("forwards page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_abc", limit: 10 });
      expect(capturedUrl).toContain("page_token=tok_abc");
      expect(capturedUrl).toContain("limit=10");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/inboxes`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [stubInbox],
              _pagination: { next: `${BASE}/inboxes?page_token=tok_p2` },
            });
          }
          return HttpResponse.json({ _results: [{ ...stubInbox, id: "inb_456" }], _pagination: {} });
        }),
      );

      const result = await service.list({ action: "list", auto_paginate: true });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("does a single fetch when auto_paginate is not set", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/inboxes`, () => {
          callCount++;
          return HttpResponse.json({
            _results: [stubInbox],
            _pagination: { next: `${BASE}/inboxes?page_token=tok_p2` },
          });
        }),
      );

      await service.list({ action: "list" });
      expect(callCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("calls GET /inboxes/{id} and returns the inbox", async () => {
      server.use(
        http.get(`${BASE}/inboxes/inb_123`, () => HttpResponse.json(stubInbox)),
      );

      const result = await service.get({ action: "get", inbox_id: "inb_123" });
      expect(result.id).toBe("inb_123");
      expect(result.name).toBe("Support");
    });

    it("passes the correct inbox_id in the URL", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes/inb_abc`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...stubInbox, id: "inb_abc" });
        }),
      );

      await service.get({ action: "get", inbox_id: "inb_abc" });
      expect(capturedUrl).toContain("/inboxes/inb_abc");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("calls POST /inboxes with name in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/inboxes`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubInbox, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Support" });
      expect(capturedBody).toMatchObject({ name: "Support" });
    });

    it("includes teammate_ids when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/inboxes`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubInbox, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        name: "Support",
        teammate_ids: ["tea_1", "tea_2"],
        confirm: true,
      });

      expect(capturedBody).toMatchObject({
        name: "Support",
        teammate_ids: ["tea_1", "tea_2"],
      });
    });

    it("omits teammate_ids when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/inboxes`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(stubInbox, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Sales" });
      expect(capturedBody).not.toHaveProperty("teammate_ids");
    });
  });

  // ---------------------------------------------------------------------------
  // list_channels
  // ---------------------------------------------------------------------------
  describe("listChannels", () => {
    it("calls GET /inboxes/{id}/channels and returns paginated results", async () => {
      server.use(
        http.get(`${BASE}/inboxes/inb_123/channels`, () =>
          HttpResponse.json({ _results: [stubChannel], _pagination: {} }),
        ),
      );

      const result = await service.listChannels({
        action: "list_channels",
        inbox_id: "inb_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cha_1");
    });

    it("forwards page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes/inb_123/channels`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listChannels({
        action: "list_channels",
        inbox_id: "inb_123",
        page_token: "tok_ch1",
        limit: 5,
      });
      expect(capturedUrl).toContain("page_token=tok_ch1");
      expect(capturedUrl).toContain("limit=5");
    });

    it("uses the inbox_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes/inb_xyz/channels`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listChannels({
        action: "list_channels",
        inbox_id: "inb_xyz",
      });
      expect(capturedUrl).toContain("/inboxes/inb_xyz/channels");
    });
  });

  // ---------------------------------------------------------------------------
  // list_conversations
  // ---------------------------------------------------------------------------
  describe("listConversations", () => {
    it("calls GET /inboxes/{id}/conversations and returns paginated results", async () => {
      server.use(
        http.get(`${BASE}/inboxes/inb_123/conversations`, () =>
          HttpResponse.json({ _results: [stubConversation], _pagination: {} }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        inbox_id: "inb_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cnv_1");
    });

    it("forwards page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes/inb_123/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listConversations({
        action: "list_conversations",
        inbox_id: "inb_123",
        page_token: "tok_cv1",
        limit: 25,
      });
      expect(capturedUrl).toContain("page_token=tok_cv1");
      expect(capturedUrl).toContain("limit=25");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/inboxes/inb_123/conversations`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [stubConversation],
              _pagination: { next: `${BASE}/inboxes/inb_123/conversations?page_token=tok_p2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...stubConversation, id: "cnv_2" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        inbox_id: "inb_123",
        auto_paginate: true,
      });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // list_access
  // ---------------------------------------------------------------------------
  describe("listAccess", () => {
    it("calls GET /inboxes/{id}/teammates and returns paginated results", async () => {
      server.use(
        http.get(`${BASE}/inboxes/inb_123/teammates`, () =>
          HttpResponse.json({ _results: [stubTeammate], _pagination: {} }),
        ),
      );

      const result = await service.listAccess({
        action: "list_access",
        inbox_id: "inb_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tea_1");
    });

    it("uses the inbox_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes/inb_abc/teammates`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listAccess({ action: "list_access", inbox_id: "inb_abc" });
      expect(capturedUrl).toContain("/inboxes/inb_abc/teammates");
    });
  });

  // ---------------------------------------------------------------------------
  // grant_access
  // ---------------------------------------------------------------------------
  describe("grantAccess", () => {
    it("calls POST /inboxes/{id}/teammates with teammate_ids", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/inboxes/inb_123/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.grantAccess({
        action: "grant_access",
        inbox_id: "inb_123",
        teammate_ids: ["tea_1", "tea_2"],
      });

      expect(capturedUrl).toContain("/inboxes/inb_123/teammates");
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1", "tea_2"] });
      expect(result).toEqual({});
    });

    it("works with the confirm flag", async () => {
      server.use(
        http.post(`${BASE}/inboxes/inb_123/teammates`, async () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await service.grantAccess({
        action: "grant_access",
        inbox_id: "inb_123",
        teammate_ids: ["tea_1"],
        confirm: true,
      });

      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // revoke_access
  // ---------------------------------------------------------------------------
  describe("revokeAccess", () => {
    it("calls DELETE /inboxes/{id}/teammates with teammate_ids in body", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/inboxes/inb_123/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.revokeAccess({
        action: "revoke_access",
        inbox_id: "inb_123",
        teammate_ids: ["tea_1"],
      });

      expect(capturedUrl).toContain("/inboxes/inb_123/teammates");
      expect(capturedBody).toMatchObject({ teammate_ids: ["tea_1"] });
      expect(result).toEqual({});
    });

    it("works with the confirm flag", async () => {
      server.use(
        http.delete(`${BASE}/inboxes/inb_123/teammates`, async () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await service.revokeAccess({
        action: "revoke_access",
        inbox_id: "inb_123",
        teammate_ids: ["tea_2"],
        confirm: true,
      });

      expect(result).toEqual({});
    });

    it("passes correct inbox_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/inboxes/inb_xyz/teammates`, async ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.revokeAccess({
        action: "revoke_access",
        inbox_id: "inb_xyz",
        teammate_ids: ["tea_3"],
      });

      expect(capturedUrl).toContain("/inboxes/inb_xyz/teammates");
    });
  });
});
