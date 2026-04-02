import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { CommentsService } from "../../../src/services/comments.service.js";
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

const sampleComment = {
  id: "com_123",
  author: { id: "tea_1", email: "agent@acme.com" },
  body: "This is a comment",
  posted_at: 1700000000,
};

const sampleMention = {
  id: "tea_1",
  email: "agent@acme.com",
};

describe("CommentsService", () => {
  let service: CommentsService;

  beforeEach(() => {
    service = new CommentsService(makeClient());
  });

  describe("list", () => {
    it("returns comments from GET /conversations/{id}/comments", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_123/comments`, () =>
          HttpResponse.json({ _results: [sampleComment], _pagination: {} }),
        ),
      );

      const result = await service.list({
        action: "list",
        conversation_id: "cnv_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("com_123");
    });

    it("uses the correct conversation_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/conversations/cnv_999/comments`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", conversation_id: "cnv_999" });
      expect(capturedUrl).toContain("/conversations/cnv_999/comments");
    });
  });

  describe("get", () => {
    it("returns a comment from GET /comments/{id}", async () => {
      server.use(
        http.get(`${BASE}/comments/com_123`, () => HttpResponse.json(sampleComment)),
      );

      const result = await service.get({ action: "get", comment_id: "com_123" });
      expect(result.id).toBe("com_123");
      expect(result.body).toBe("This is a comment");
    });

    it("uses the correct comment_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/comments/com_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleComment, id: "com_999" });
        }),
      );

      await service.get({ action: "get", comment_id: "com_999" });
      expect(capturedUrl).toContain("/comments/com_999");
    });
  });

  describe("create", () => {
    it("sends POST /conversations/{id}/comments with body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_123/comments`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleComment, { status: 201 });
        }),
      );

      const result = await service.create({
        action: "create",
        conversation_id: "cnv_123",
        body: "This is a comment",
      });
      expect(capturedBody).toMatchObject({ body: "This is a comment" });
      expect(result.id).toBe("com_123");
    });

    it("includes optional author_id when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_123/comments`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleComment, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_123",
        body: "This is a comment",
        author_id: "tea_1",
      });
      expect(capturedBody).toMatchObject({ body: "This is a comment", author_id: "tea_1" });
    });

    it("omits author_id when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/conversations/cnv_123/comments`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleComment, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_123",
        body: "This is a comment",
      });
      expect(Object.keys(capturedBody)).toEqual(["body"]);
    });
  });

  describe("update", () => {
    it("sends PATCH /comments/{id} with body", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/comments/com_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleComment, body: "Updated body" });
        }),
      );

      const result = await service.update({
        action: "update",
        comment_id: "com_123",
        body: "Updated body",
      });
      expect(capturedBody).toMatchObject({ body: "Updated body" });
      expect(result.body).toBe("Updated body");
    });
  });

  describe("listMentions", () => {
    it("returns mentions from GET /comments/{id}/mentions", async () => {
      server.use(
        http.get(`${BASE}/comments/com_123/mentions`, () =>
          HttpResponse.json({ _results: [sampleMention], _pagination: {} }),
        ),
      );

      const result = await service.listMentions({
        action: "list_mentions",
        comment_id: "com_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tea_1");
    });

    it("uses the correct comment_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/comments/com_999/mentions`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listMentions({ action: "list_mentions", comment_id: "com_999" });
      expect(capturedUrl).toContain("/comments/com_999/mentions");
    });
  });

  describe("reply", () => {
    it("sends POST /comments/{id}/replies with body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/comments/com_123/replies`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleComment, { status: 201 });
        }),
      );

      const result = await service.reply({
        action: "reply",
        comment_id: "com_123",
        body: "A reply",
      });
      expect(capturedBody).toMatchObject({ body: "A reply" });
      expect(result.id).toBe("com_123");
    });

    it("includes optional author_id when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/comments/com_123/replies`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleComment, { status: 201 });
        }),
      );

      await service.reply({
        action: "reply",
        comment_id: "com_123",
        body: "A reply",
        author_id: "tea_2",
      });
      expect(capturedBody).toMatchObject({ body: "A reply", author_id: "tea_2" });
    });
  });
});
