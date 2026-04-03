import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { MessageTemplatesService } from "../../../src/services/message-templates.service.js";
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

const sampleTemplate = {
  id: "rsp_123",
  name: "Welcome Email",
  subject: "Welcome to our service!",
  body: "<p>Hello and welcome!</p>",
  created_at: 1700000000,
  updated_at: 1700000001,
};

describe("MessageTemplatesService", () => {
  let service: MessageTemplatesService;

  beforeEach(() => {
    service = new MessageTemplatesService(makeClient());
  });

  describe("list", () => {
    it("returns paginated templates from GET /message_templates", async () => {
      server.use(
        http.get(`${BASE}/message_templates`, () =>
          HttpResponse.json({ _results: [sampleTemplate], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("rsp_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/message_templates`, ({ request }) => {
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
        http.get(`${BASE}/message_templates`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleTemplate],
              _pagination: { next: `${BASE}/message_templates?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleTemplate, id: "rsp_456" }],
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
        http.get(`${BASE}/message_templates`, () =>
          HttpResponse.json({
            _results: [sampleTemplate],
            _pagination: { next: `${BASE}/message_templates?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns a template from GET /message_templates/{id}", async () => {
      server.use(
        http.get(`${BASE}/message_templates/rsp_123`, () => HttpResponse.json(sampleTemplate)),
      );

      const result = await service.get({ action: "get", template_id: "rsp_123" });
      expect(result.id).toBe("rsp_123");
      expect(result.name).toBe("Welcome Email");
    });
  });

  describe("create", () => {
    it("sends POST /message_templates with name and body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/message_templates`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleTemplate, { status: 201 });
        }),
      );

      const result = await service.create({
        action: "create",
        name: "Welcome Email",
        body: "<p>Hello and welcome!</p>",
      });
      expect(capturedBody).toMatchObject({ name: "Welcome Email", body: "<p>Hello and welcome!</p>" });
      expect(result.id).toBe("rsp_123");
    });

    it("includes optional fields when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/message_templates`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleTemplate, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        name: "Welcome Email",
        body: "<p>Hello!</p>",
        subject: "Welcome!",
        folder_id: "tmf_123",
        inbox_ids: ["inb_1", "inb_2"],
      });
      expect(capturedBody).toMatchObject({
        subject: "Welcome!",
        folder_id: "tmf_123",
        inbox_ids: ["inb_1", "inb_2"],
      });
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/message_templates`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleTemplate, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Welcome Email", body: "<p>Hi!</p>" });
      expect(Object.keys(capturedBody)).toEqual(["name", "body"]);
    });
  });

  describe("update", () => {
    it("sends PATCH /message_templates/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/message_templates/rsp_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleTemplate, name: "Updated Template" });
        }),
      );

      const result = await service.update({
        action: "update",
        template_id: "rsp_123",
        name: "Updated Template",
      });
      expect(capturedBody).toMatchObject({ name: "Updated Template" });
      expect(result.name).toBe("Updated Template");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/message_templates/rsp_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleTemplate);
        }),
      );

      await service.update({ action: "update", template_id: "rsp_123", body: "<p>New body</p>" });
      expect(capturedBody).toEqual({ body: "<p>New body</p>" });
    });
  });

  describe("delete", () => {
    it("sends DELETE /message_templates/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/message_templates/rsp_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", template_id: "rsp_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("uses the correct template_id in the delete path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/message_templates/rsp_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.delete({ action: "delete", template_id: "rsp_xyz" });
      expect(capturedUrl).toContain("/message_templates/rsp_xyz");
    });
  });

});
