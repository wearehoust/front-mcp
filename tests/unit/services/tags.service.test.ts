import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { TagsService } from "../../../src/services/tags.service.js";
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

const sampleTag = {
  id: "tag_123",
  name: "Urgent",
  highlight: "red",
  is_visible_in_conversation_lists: true,
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleConversation = {
  id: "cnv_abc",
  subject: "Help needed",
  status: "open",
};

describe("TagsService", () => {
  let service: TagsService;

  beforeEach(() => {
    service = new TagsService(makeClient());
  });

  describe("list", () => {
    it("returns paginated tags from GET /tags", async () => {
      server.use(
        http.get(`${BASE}/tags`, () =>
          HttpResponse.json({ _results: [sampleTag], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tag_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/tags`, ({ request }) => {
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
        http.get(`${BASE}/tags`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleTag],
              _pagination: { next: `${BASE}/tags?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleTag, id: "tag_456" }],
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
        http.get(`${BASE}/tags`, () =>
          HttpResponse.json({
            _results: [sampleTag],
            _pagination: { next: `${BASE}/tags?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns a tag from GET /tags/{id}", async () => {
      server.use(
        http.get(`${BASE}/tags/tag_123`, () => HttpResponse.json(sampleTag)),
      );

      const result = await service.get({ action: "get", tag_id: "tag_123" });
      expect(result.id).toBe("tag_123");
      expect(result.name).toBe("Urgent");
    });

    it("uses the correct tag_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/tags/tag_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleTag, id: "tag_999" });
        }),
      );

      await service.get({ action: "get", tag_id: "tag_999" });
      expect(capturedUrl).toContain("/tags/tag_999");
    });
  });

  describe("create", () => {
    it("sends POST /tags with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/tags`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleTag, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "Urgent" });
      expect(capturedBody).toMatchObject({ name: "Urgent" });
      expect(result.id).toBe("tag_123");
    });

    it("includes optional highlight and is_visible_in_conversation_lists", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/tags`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleTag, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        name: "Urgent",
        highlight: "red",
        is_visible_in_conversation_lists: false,
      });
      expect(capturedBody).toMatchObject({
        name: "Urgent",
        highlight: "red",
        is_visible_in_conversation_lists: false,
      });
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/tags`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleTag, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Urgent" });
      expect(Object.keys(capturedBody)).toEqual(["name"]);
    });
  });

  describe("update", () => {
    it("sends PATCH /tags/{id} with updated fields", async () => {
      let capturedBody: unknown;
      let capturedMethod = "";
      server.use(
        http.patch(`${BASE}/tags/tag_123`, async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleTag, name: "Critical" });
        }),
      );

      const result = await service.update({
        action: "update",
        tag_id: "tag_123",
        name: "Critical",
      });
      expect(capturedMethod).toBe("PATCH");
      expect(capturedBody).toMatchObject({ name: "Critical" });
      expect(result.name).toBe("Critical");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/tags/tag_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleTag);
        }),
      );

      await service.update({
        action: "update",
        tag_id: "tag_123",
        highlight: "green",
      });
      expect(capturedBody).toEqual({ highlight: "green" });
    });
  });

  describe("delete", () => {
    it("sends DELETE /tags/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/tags/tag_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", tag_id: "tag_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("uses the correct tag_id in the delete path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/tags/tag_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.delete({ action: "delete", tag_id: "tag_xyz" });
      expect(capturedUrl).toContain("/tags/tag_xyz");
    });
  });

  describe("listChildren", () => {
    it("returns children from GET /tags/{id}/children", async () => {
      const childTag = { ...sampleTag, id: "tag_child_1", name: "Sub-Urgent" };
      server.use(
        http.get(`${BASE}/tags/tag_123/children`, () =>
          HttpResponse.json({ _results: [childTag], _pagination: {} }),
        ),
      );

      const result = await service.listChildren({
        action: "list_children",
        tag_id: "tag_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tag_child_1");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/tags/tag_123/children`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listChildren({
        action: "list_children",
        tag_id: "tag_123",
        page_token: "childpage",
        limit: 10,
      });
      expect(capturedUrl).toContain("page_token=childpage");
      expect(capturedUrl).toContain("limit=10");
    });
  });

  describe("createChild", () => {
    it("sends POST /tags/{id}/children with name", async () => {
      let capturedBody: unknown;
      const childTag = { ...sampleTag, id: "tag_child_2", name: "Sub-tag" };
      server.use(
        http.post(`${BASE}/tags/tag_123/children`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(childTag, { status: 201 });
        }),
      );

      const result = await service.createChild({
        action: "create_child",
        tag_id: "tag_123",
        name: "Sub-tag",
      });
      expect(capturedBody).toMatchObject({ name: "Sub-tag" });
      expect(result.id).toBe("tag_child_2");
    });

    it("includes optional highlight when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/tags/tag_123/children`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleTag, id: "tag_child_3" }, { status: 201 });
        }),
      );

      await service.createChild({
        action: "create_child",
        tag_id: "tag_123",
        name: "Sub-tag",
        highlight: "blue",
      });
      expect(capturedBody).toMatchObject({ name: "Sub-tag", highlight: "blue" });
    });
  });

  describe("listConversations", () => {
    it("returns conversations from GET /tags/{id}/conversations", async () => {
      server.use(
        http.get(`${BASE}/tags/tag_123/conversations`, () =>
          HttpResponse.json({ _results: [sampleConversation], _pagination: {} }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        tag_id: "tag_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cnv_abc");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/tags/tag_123/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listConversations({
        action: "list_conversations",
        tag_id: "tag_123",
        page_token: "convpage",
        limit: 50,
      });
      expect(capturedUrl).toContain("page_token=convpage");
      expect(capturedUrl).toContain("limit=50");
    });

    it("returns next_page_token when more conversations exist", async () => {
      server.use(
        http.get(`${BASE}/tags/tag_123/conversations`, () =>
          HttpResponse.json({
            _results: [sampleConversation],
            _pagination: { next: `${BASE}/tags/tag_123/conversations?page_token=conv_next` },
          }),
        ),
      );

      const result = await service.listConversations({
        action: "list_conversations",
        tag_id: "tag_123",
      });
      expect(result.next_page_token).toBe("conv_next");
    });
  });
});
