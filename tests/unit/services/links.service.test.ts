import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { LinksService } from "../../../src/services/links.service.js";
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

const sampleLink = {
  id: "lnk_123",
  name: "Front Homepage",
  type: "web",
  external_url: "https://front.com",
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleConversation = {
  id: "cnv_abc",
  subject: "Help needed",
  status: "open",
};

describe("LinksService", () => {
  let service: LinksService;

  beforeEach(() => {
    service = new LinksService(makeClient());
  });

  describe("list", () => {
    it("returns paginated links from GET /links", async () => {
      server.use(
        http.get(`${BASE}/links`, () =>
          HttpResponse.json({ _results: [sampleLink], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("lnk_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/links`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 25 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=25");
    });

    it("passes optional name and type filters", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/links`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", name: "Front", type: "web" });
      expect(capturedUrl).toContain("name=Front");
      expect(capturedUrl).toContain("type=web");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/links`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleLink],
              _pagination: { next: `${BASE}/links?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleLink, id: "lnk_456" }],
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
        http.get(`${BASE}/links`, () =>
          HttpResponse.json({
            _results: [sampleLink],
            _pagination: { next: `${BASE}/links?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns a link from GET /links/{id}", async () => {
      server.use(
        http.get(`${BASE}/links/lnk_123`, () => HttpResponse.json(sampleLink)),
      );

      const result = await service.get({ action: "get", link_id: "lnk_123" });
      expect(result.id).toBe("lnk_123");
      expect(result.name).toBe("Front Homepage");
    });

    it("uses the correct link_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/links/lnk_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleLink, id: "lnk_999" });
        }),
      );

      await service.get({ action: "get", link_id: "lnk_999" });
      expect(capturedUrl).toContain("/links/lnk_999");
    });
  });

  describe("create", () => {
    it("sends POST /links with name and external_url", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/links`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleLink, { status: 201 });
        }),
      );

      const result = await service.create({
        action: "create",
        name: "Front Homepage",
        external_url: "https://front.com",
      });
      expect(capturedBody).toMatchObject({ name: "Front Homepage", external_url: "https://front.com" });
      expect(result.id).toBe("lnk_123");
    });

    it("includes optional type and pattern when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/links`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleLink, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        name: "Front Homepage",
        external_url: "https://front.com",
        type: "web",
        pattern: "https://front.com/*",
      });
      expect(capturedBody).toMatchObject({ type: "web", pattern: "https://front.com/*" });
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/links`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleLink, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Front Homepage", external_url: "https://front.com" });
      expect(Object.keys(capturedBody)).toEqual(["name", "external_url"]);
    });
  });

  describe("update", () => {
    it("sends PATCH /links/{id} with updated name", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/links/lnk_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleLink, name: "Updated Link" });
        }),
      );

      const result = await service.update({
        action: "update",
        link_id: "lnk_123",
        name: "Updated Link",
      });
      expect(capturedBody).toMatchObject({ name: "Updated Link" });
      expect(result.name).toBe("Updated Link");
    });

    it("sends empty body when no optional fields provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/links/lnk_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleLink);
        }),
      );

      await service.update({ action: "update", link_id: "lnk_123" });
      expect(capturedBody).toEqual({});
    });
  });

  describe("listConversations", () => {
    it("returns conversations from GET /links/{id}/conversations", async () => {
      server.use(
        http.get(`${BASE}/links/lnk_123/conversations`, () =>
          HttpResponse.json({ _results: [sampleConversation], _pagination: {} }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        link_id: "lnk_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cnv_abc");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/links/lnk_123/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listConversations({
        action: "list_conversations",
        link_id: "lnk_123",
        page_token: "convpage",
        limit: 50,
      });
      expect(capturedUrl).toContain("page_token=convpage");
      expect(capturedUrl).toContain("limit=50");
    });

    it("returns next_page_token when more conversations exist", async () => {
      server.use(
        http.get(`${BASE}/links/lnk_123/conversations`, () =>
          HttpResponse.json({
            _results: [sampleConversation],
            _pagination: { next: `${BASE}/links/lnk_123/conversations?page_token=conv_next` },
          }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        link_id: "lnk_123",
      });
      expect(result.next_page_token).toBe("conv_next");
    });
  });
});
