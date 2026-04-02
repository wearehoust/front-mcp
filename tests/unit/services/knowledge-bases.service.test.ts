import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { KnowledgeBasesService } from "../../../src/services/knowledge-bases.service.js";
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

const sampleKB = {
  id: "knb_123",
  name: "Help Center",
  locale: "en",
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleArticle = {
  id: "kba_456",
  subject: "Getting Started",
  content: "<p>Welcome!</p>",
  status: "published",
};

const sampleCategory = {
  id: "kbc_789",
  name: "Onboarding",
  description: "Getting started guides",
};

describe("KnowledgeBasesService", () => {
  let service: KnowledgeBasesService;

  beforeEach(() => {
    service = new KnowledgeBasesService(makeClient());
  });

  describe("list", () => {
    it("returns paginated knowledge bases from GET /knowledge_bases", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases`, () =>
          HttpResponse.json({ _results: [sampleKB], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("knb_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/knowledge_bases`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 10 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=10");
    });

    it("returns next_page_token when more pages exist", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases`, () =>
          HttpResponse.json({
            _results: [sampleKB],
            _pagination: { next: `${BASE}/knowledge_bases?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns a knowledge base from GET /knowledge_bases/{id}", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases/knb_123`, () => HttpResponse.json(sampleKB)),
      );

      const result = await service.get({ action: "get", knowledge_base_id: "knb_123" });
      expect(result.id).toBe("knb_123");
      expect(result.name).toBe("Help Center");
    });
  });

  describe("create", () => {
    it("sends POST /knowledge_bases with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/knowledge_bases`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleKB, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "Help Center" });
      expect(capturedBody).toMatchObject({ name: "Help Center" });
      expect(result.id).toBe("knb_123");
    });

    it("includes optional locale when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/knowledge_bases`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleKB, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Help Center", locale: "fr" });
      expect(capturedBody).toMatchObject({ name: "Help Center", locale: "fr" });
    });
  });

  describe("update", () => {
    it("sends PATCH /knowledge_bases/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/knowledge_bases/knb_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleKB, name: "New Name" });
        }),
      );

      const result = await service.update({ action: "update", knowledge_base_id: "knb_123", name: "New Name" });
      expect(capturedBody).toMatchObject({ name: "New Name" });
      expect(result.name).toBe("New Name");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/knowledge_bases/knb_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleKB);
        }),
      );

      await service.update({ action: "update", knowledge_base_id: "knb_123", locale: "de" });
      expect(capturedBody).toEqual({ locale: "de" });
    });
  });

  describe("listCategories", () => {
    it("returns categories from GET /knowledge_bases/{id}/categories", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases/knb_123/categories`, () =>
          HttpResponse.json({ _results: [sampleCategory], _pagination: {} }),
        ),
      );

      const result = await service.listCategories({ action: "list_categories", knowledge_base_id: "knb_123" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("kbc_789");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/knowledge_bases/knb_123/categories`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listCategories({ action: "list_categories", knowledge_base_id: "knb_123", page_token: "cat_tok", limit: 5 });
      expect(capturedUrl).toContain("page_token=cat_tok");
      expect(capturedUrl).toContain("limit=5");
    });
  });

  describe("listArticles", () => {
    it("returns articles from GET /knowledge_bases/{id}/articles", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases/knb_123/articles`, () =>
          HttpResponse.json({ _results: [sampleArticle], _pagination: {} }),
        ),
      );

      const result = await service.listArticles({ action: "list_articles", knowledge_base_id: "knb_123" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("kba_456");
    });
  });

  describe("getArticle", () => {
    it("returns an article from GET /knowledge_bases/{id}/articles/{article_id}", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases/knb_123/articles/kba_456`, () =>
          HttpResponse.json(sampleArticle),
        ),
      );

      const result = await service.getArticle({ action: "get_article", knowledge_base_id: "knb_123", article_id: "kba_456" });
      expect(result.id).toBe("kba_456");
      expect(result.subject).toBe("Getting Started");
    });
  });

  describe("createArticle", () => {
    it("sends POST /knowledge_bases/{id}/articles with required fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/knowledge_bases/knb_123/articles`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleArticle, { status: 201 });
        }),
      );

      const result = await service.createArticle({
        action: "create_article",
        knowledge_base_id: "knb_123",
        subject: "Getting Started",
        content: "<p>Welcome!</p>",
      });
      expect(capturedBody).toMatchObject({ subject: "Getting Started", content: "<p>Welcome!</p>" });
      expect(result.id).toBe("kba_456");
    });

    it("includes optional fields when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/knowledge_bases/knb_123/articles`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleArticle, { status: 201 });
        }),
      );

      await service.createArticle({
        action: "create_article",
        knowledge_base_id: "knb_123",
        subject: "Getting Started",
        content: "<p>Welcome!</p>",
        status: "draft",
        locale: "en",
      });
      expect(capturedBody).toMatchObject({ status: "draft", locale: "en" });
    });
  });

  describe("updateArticle", () => {
    it("sends PATCH /knowledge_bases/{id}/articles/{article_id}", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/knowledge_bases/knb_123/articles/kba_456`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleArticle, subject: "Updated" });
        }),
      );

      const result = await service.updateArticle({
        action: "update_article",
        knowledge_base_id: "knb_123",
        article_id: "kba_456",
        subject: "Updated",
      });
      expect(capturedBody).toMatchObject({ subject: "Updated" });
      expect(result.subject).toBe("Updated");
    });
  });

  describe("deleteArticle", () => {
    it("sends DELETE /knowledge_bases/{id}/articles/{article_id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/knowledge_bases/knb_123/articles/kba_456`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.deleteArticle({ action: "delete_article", knowledge_base_id: "knb_123", article_id: "kba_456" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });
  });

  describe("getCategory", () => {
    it("returns a category from GET /knowledge_bases/{id}/categories/{category_id}", async () => {
      server.use(
        http.get(`${BASE}/knowledge_bases/knb_123/categories/kbc_789`, () =>
          HttpResponse.json(sampleCategory),
        ),
      );

      const result = await service.getCategory({ action: "get_category", knowledge_base_id: "knb_123", category_id: "kbc_789" });
      expect(result.id).toBe("kbc_789");
      expect(result.name).toBe("Onboarding");
    });
  });

  describe("createCategory", () => {
    it("sends POST /knowledge_bases/{id}/categories with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/knowledge_bases/knb_123/categories`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleCategory, { status: 201 });
        }),
      );

      const result = await service.createCategory({
        action: "create_category",
        knowledge_base_id: "knb_123",
        name: "Onboarding",
      });
      expect(capturedBody).toMatchObject({ name: "Onboarding" });
      expect(result.id).toBe("kbc_789");
    });

    it("includes optional description when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/knowledge_bases/knb_123/categories`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleCategory, { status: 201 });
        }),
      );

      await service.createCategory({
        action: "create_category",
        knowledge_base_id: "knb_123",
        name: "Onboarding",
        description: "Getting started guides",
      });
      expect(capturedBody).toMatchObject({ name: "Onboarding", description: "Getting started guides" });
    });
  });

  describe("updateCategory", () => {
    it("sends PATCH /knowledge_bases/{id}/categories/{category_id}", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/knowledge_bases/knb_123/categories/kbc_789`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleCategory, name: "Updated Category" });
        }),
      );

      const result = await service.updateCategory({
        action: "update_category",
        knowledge_base_id: "knb_123",
        category_id: "kbc_789",
        name: "Updated Category",
      });
      expect(capturedBody).toMatchObject({ name: "Updated Category" });
      expect(result.name).toBe("Updated Category");
    });
  });

  describe("deleteCategory", () => {
    it("sends DELETE /knowledge_bases/{id}/categories/{category_id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/knowledge_bases/knb_123/categories/kbc_789`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.deleteCategory({ action: "delete_category", knowledge_base_id: "knb_123", category_id: "kbc_789" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });
  });
});
