import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { DraftsService } from "../../../src/services/drafts.service.js";
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

const sampleDraft = {
  id: "dft_123",
  author: { id: "tea_abc" },
  body: "Hello, how can I help?",
  subject: "Support request",
  mode: "shared",
  created_at: 1700000000,
  updated_at: 1700000001,
};

describe("DraftsService", () => {
  let service: DraftsService;

  beforeEach(() => {
    service = new DraftsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns drafts from GET /conversations/{id}/drafts", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_123/drafts`, () =>
          HttpResponse.json({ _results: [sampleDraft], _pagination: {} }),
        ),
      );

      const result = await service.list({
        action: "list",
        conversation_id: "cnv_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("dft_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/conversations/cnv_123/drafts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({
        action: "list",
        conversation_id: "cnv_123",
        page_token: "dtok",
        limit: 20,
      });
      expect(capturedUrl).toContain("page_token=dtok");
      expect(capturedUrl).toContain("limit=20");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/conversations/cnv_123/drafts`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          if (url.searchParams.get("page_token") === null) {
            return HttpResponse.json({
              _results: [sampleDraft],
              _pagination: { next: `${BASE}/conversations/cnv_123/drafts?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleDraft, id: "dft_456" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.list({
        action: "list",
        conversation_id: "cnv_123",
        auto_paginate: true,
      });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("returns next_page_token when more pages exist", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_123/drafts`, () =>
          HttpResponse.json({
            _results: [sampleDraft],
            _pagination: { next: `${BASE}/conversations/cnv_123/drafts?page_token=dnext` },
          }),
        ),
      );

      const result = await service.list({ action: "list", conversation_id: "cnv_123" });
      expect(result.next_page_token).toBe("dnext");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("sends POST /conversations/{id}/drafts with required fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_123/drafts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleDraft, { status: 201 });
        }),
      );

      const result = await service.create({
        action: "create",
        conversation_id: "cnv_123",
        author_id: "tea_abc",
        body: "Hello, how can I help?",
      });
      expect(capturedBody).toMatchObject({ author_id: "tea_abc", body: "Hello, how can I help?" });
      expect(result.id).toBe("dft_123");
    });

    it("includes optional fields when provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/conversations/cnv_123/drafts`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleDraft, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_123",
        author_id: "tea_abc",
        body: "Reply body",
        subject: "Re: Issue",
        to: ["user@example.com"],
        cc: ["cc@example.com"],
        mode: "shared",
      });
      expect(capturedBody["subject"]).toBe("Re: Issue");
      expect(capturedBody["to"]).toEqual(["user@example.com"]);
      expect(capturedBody["cc"]).toEqual(["cc@example.com"]);
      expect(capturedBody["mode"]).toBe("shared");
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/conversations/cnv_123/drafts`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleDraft, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_123",
        author_id: "tea_abc",
        body: "Just a body",
      });
      expect(Object.keys(capturedBody)).toEqual(["author_id", "body"]);
    });
  });

  // ---------------------------------------------------------------------------
  // createReply
  // ---------------------------------------------------------------------------
  describe("createReply", () => {
    it("sends POST /conversations/{id}/drafts with reply body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_123/drafts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleDraft, { status: 201 });
        }),
      );

      const result = await service.createReply({
        action: "create_reply",
        conversation_id: "cnv_123",
        author_id: "tea_abc",
        body: "Thanks for reaching out!",
      });
      expect(capturedBody).toMatchObject({ author_id: "tea_abc", body: "Thanks for reaching out!" });
      expect(result.id).toBe("dft_123");
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("sends PATCH /drafts/{id} with updated fields", async () => {
      let capturedBody: unknown;
      let capturedMethod = "";
      server.use(
        http.patch(`${BASE}/drafts/dft_123`, async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleDraft, body: "Updated body" });
        }),
      );

      const result = await service.update({
        action: "update",
        draft_id: "dft_123",
        author_id: "tea_abc",
        body: "Updated body",
      });
      expect(capturedMethod).toBe("PATCH");
      expect(capturedBody).toMatchObject({ author_id: "tea_abc", body: "Updated body" });
      expect(result.body).toBe("Updated body");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/drafts/dft_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleDraft);
        }),
      );

      await service.update({
        action: "update",
        draft_id: "dft_123",
        author_id: "tea_abc",
      });
      expect(Object.keys(capturedBody)).toEqual(["author_id"]);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe("delete", () => {
    it("sends DELETE /drafts/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/drafts/dft_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", draft_id: "dft_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("uses the correct draft_id in the delete path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/drafts/dft_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.delete({ action: "delete", draft_id: "dft_xyz" });
      expect(capturedUrl).toContain("/drafts/dft_xyz");
    });
  });
});
