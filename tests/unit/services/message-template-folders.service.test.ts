import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { MessageTemplateFoldersService } from "../../../src/services/message-template-folders.service.js";
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

const sampleFolder = {
  id: "tmf_123",
  name: "Support Templates",
  created_at: 1700000000,
  updated_at: 1700000001,
};

describe("MessageTemplateFoldersService", () => {
  let service: MessageTemplateFoldersService;

  beforeEach(() => {
    service = new MessageTemplateFoldersService(makeClient());
  });

  describe("list", () => {
    it("returns paginated folders from GET /message_template_folders", async () => {
      server.use(
        http.get(`${BASE}/message_template_folders`, () =>
          HttpResponse.json({ _results: [sampleFolder], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tmf_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/message_template_folders`, ({ request }) => {
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
        http.get(`${BASE}/message_template_folders`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleFolder],
              _pagination: { next: `${BASE}/message_template_folders?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleFolder, id: "tmf_456" }],
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
        http.get(`${BASE}/message_template_folders`, () =>
          HttpResponse.json({
            _results: [sampleFolder],
            _pagination: { next: `${BASE}/message_template_folders?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns a folder from GET /message_template_folders/{id}", async () => {
      server.use(
        http.get(`${BASE}/message_template_folders/tmf_123`, () => HttpResponse.json(sampleFolder)),
      );

      const result = await service.get({ action: "get", folder_id: "tmf_123" });
      expect(result.id).toBe("tmf_123");
      expect(result.name).toBe("Support Templates");
    });
  });

  describe("create", () => {
    it("sends POST /message_template_folders with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/message_template_folders`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleFolder, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "Support Templates" });
      expect(capturedBody).toMatchObject({ name: "Support Templates" });
      expect(result.id).toBe("tmf_123");
    });

    it("includes optional parent_folder_id when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/message_template_folders`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleFolder, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Sub Folder", parent_folder_id: "tmf_parent" });
      expect(capturedBody).toMatchObject({ name: "Sub Folder", parent_folder_id: "tmf_parent" });
    });

    it("omits parent_folder_id when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/message_template_folders`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleFolder, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Support Templates" });
      expect(Object.keys(capturedBody)).toEqual(["name"]);
    });
  });

  describe("update", () => {
    it("sends PATCH /message_template_folders/{id} with updated name", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/message_template_folders/tmf_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleFolder, name: "Updated Folder" });
        }),
      );

      const result = await service.update({ action: "update", folder_id: "tmf_123", name: "Updated Folder" });
      expect(capturedBody).toMatchObject({ name: "Updated Folder" });
      expect(result.name).toBe("Updated Folder");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/message_template_folders/tmf_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleFolder);
        }),
      );

      await service.update({ action: "update", folder_id: "tmf_123", parent_folder_id: "tmf_new_parent" });
      expect(capturedBody).toEqual({ parent_folder_id: "tmf_new_parent" });
    });
  });

  describe("delete", () => {
    it("sends DELETE /message_template_folders/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/message_template_folders/tmf_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", folder_id: "tmf_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });
  });

  describe("listChildren", () => {
    it("returns children from GET /message_template_folders/{id}/message_template_folders", async () => {
      const childFolder = { ...sampleFolder, id: "tmf_child_1", name: "Sub Folder" };
      server.use(
        http.get(`${BASE}/message_template_folders/tmf_123/message_template_folders`, () =>
          HttpResponse.json({ _results: [childFolder], _pagination: {} }),
        ),
      );

      const result = await service.listChildren({ action: "list_children", folder_id: "tmf_123" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("tmf_child_1");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/message_template_folders/tmf_123/message_template_folders`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listChildren({ action: "list_children", folder_id: "tmf_123", page_token: "childpage", limit: 10 });
      expect(capturedUrl).toContain("page_token=childpage");
      expect(capturedUrl).toContain("limit=10");
    });
  });

  describe("createChild", () => {
    it("sends POST /message_template_folders/{id}/message_template_folders with name", async () => {
      let capturedBody: unknown;
      const childFolder = { ...sampleFolder, id: "tmf_child_2", name: "Sub Folder" };
      server.use(
        http.post(`${BASE}/message_template_folders/tmf_123/message_template_folders`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(childFolder, { status: 201 });
        }),
      );

      const result = await service.createChild({ action: "create_child", folder_id: "tmf_123", name: "Sub Folder" });
      expect(capturedBody).toMatchObject({ name: "Sub Folder" });
      expect(result.id).toBe("tmf_child_2");
    });
  });
});
