import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { ContactNotesService } from "../../../src/services/contact_notes.service.js";
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

const sampleNote = {
  id: "note_123",
  author: { id: "tea_abc" },
  body: "Important VIP customer",
  created_at: 1700000000,
};

describe("ContactNotesService", () => {
  let service: ContactNotesService;

  beforeEach(() => {
    service = new ContactNotesService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated notes from GET /contacts/{id}/notes", async () => {
      server.use(
        http.get(`${BASE}/contacts/crd_123/notes`, () =>
          HttpResponse.json({ _results: [sampleNote], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list", contact_id: "crd_123" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("note_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contacts/crd_123/notes`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({
        action: "list",
        contact_id: "crd_123",
        page_token: "ntok",
        limit: 10,
      });
      expect(capturedUrl).toContain("page_token=ntok");
      expect(capturedUrl).toContain("limit=10");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/contacts/crd_123/notes`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          if (url.searchParams.get("page_token") === null) {
            return HttpResponse.json({
              _results: [sampleNote],
              _pagination: { next: `${BASE}/contacts/crd_123/notes?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleNote, id: "note_456" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.list({
        action: "list",
        contact_id: "crd_123",
        auto_paginate: true,
      });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("returns next_page_token when more pages exist", async () => {
      server.use(
        http.get(`${BASE}/contacts/crd_123/notes`, () =>
          HttpResponse.json({
            _results: [sampleNote],
            _pagination: { next: `${BASE}/contacts/crd_123/notes?page_token=nnext` },
          }),
        ),
      );

      const result = await service.list({ action: "list", contact_id: "crd_123" });
      expect(result.next_page_token).toBe("nnext");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("sends POST /contacts/{id}/notes with author_id and body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contacts/crd_123/notes`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleNote, { status: 201 });
        }),
      );

      const result = await service.create({
        action: "create",
        contact_id: "crd_123",
        author_id: "tea_abc",
        body: "Important VIP customer",
      });
      expect(capturedBody).toEqual({ author_id: "tea_abc", body: "Important VIP customer" });
      expect(result.id).toBe("note_123");
    });

    it("uses the correct contact_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${BASE}/contacts/crd_999/notes`, async ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(sampleNote, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        contact_id: "crd_999",
        author_id: "tea_abc",
        body: "Note body",
      });
      expect(capturedUrl).toContain("/contacts/crd_999/notes");
    });
  });
});
