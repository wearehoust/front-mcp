import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { ContactsService } from "../../../src/services/contacts.service.js";
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

const CONTACT_FIXTURE = {
  id: "crd_123",
  name: "Alice Smith",
  description: "A valued customer",
  handles: [{ id: "h_1", source: "email", handle: "alice@example.com" }],
};

describe("ContactsService", () => {
  let service: ContactsService;

  beforeEach(() => {
    service = new ContactsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated contacts", async () => {
      server.use(
        http.get(`${BASE}/contacts`, () =>
          HttpResponse.json({
            _results: [CONTACT_FIXTURE],
            _pagination: { next: null },
          }),
        ),
      );

      const result = await service.list({});
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("crd_123");
    });

    it("forwards page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contacts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ page_token: "tok_abc", limit: 25 });
      expect(capturedUrl).toContain("page_token=tok_abc");
      expect(capturedUrl).toContain("limit=25");
    });

    it("forwards sort_by and sort_order as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contacts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ sort_by: "name", sort_order: "asc" });
      expect(capturedUrl).toContain("sort_by=name");
      expect(capturedUrl).toContain("sort_order=asc");
    });

    it("auto-paginates across multiple pages", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/contacts`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [{ ...CONTACT_FIXTURE, id: "crd_1" }],
              _pagination: { next: `${BASE}/contacts?page_token=tok_2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...CONTACT_FIXTURE, id: "crd_2" }],
            _pagination: { next: null },
          });
        }),
      );

      const result = await service.list({ auto_paginate: true });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.id).toBe("crd_1");
      expect(result.results[1]?.id).toBe("crd_2");
    });

    it("exposes next_page_token when more pages remain", async () => {
      server.use(
        http.get(`${BASE}/contacts`, () =>
          HttpResponse.json({
            _results: [CONTACT_FIXTURE],
            _pagination: { next: `${BASE}/contacts?page_token=tok_next` },
          }),
        ),
      );

      const result = await service.list({});
      expect(result.next_page_token).toBe("tok_next");
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("returns a single contact by id", async () => {
      server.use(
        http.get(`${BASE}/contacts/crd_123`, () =>
          HttpResponse.json(CONTACT_FIXTURE),
        ),
      );

      const contact = await service.get("crd_123");
      expect(contact.id).toBe("crd_123");
      expect(contact.name).toBe("Alice Smith");
    });

    it("throws on 404", async () => {
      server.use(
        http.get(`${BASE}/contacts/crd_missing`, () =>
          HttpResponse.json(
            { _error: { message: "Contact not found" } },
            { status: 404 },
          ),
        ),
      );

      await expect(service.get("crd_missing")).rejects.toThrow("Contact not found");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("posts the correct body and returns a new contact", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(CONTACT_FIXTURE, { status: 201 });
        }),
      );

      const contact = await service.create({
        handles: [{ source: "email", handle: "alice@example.com" }],
        name: "Alice Smith",
        description: "A valued customer",
      });

      expect(capturedBody).toEqual({
        handles: [{ source: "email", handle: "alice@example.com" }],
        name: "Alice Smith",
        description: "A valued customer",
      });
      expect(contact.id).toBe("crd_123");
    });

    it("sends only required fields when optionals are omitted", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(CONTACT_FIXTURE, { status: 201 });
        }),
      );

      await service.create({
        handles: [{ source: "twitter", handle: "@alice" }],
      });

      expect(capturedBody).toEqual({
        handles: [{ source: "twitter", handle: "@alice" }],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("sends PATCH with the correct body", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/contacts/crd_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...CONTACT_FIXTURE, name: "Alice B. Smith" });
        }),
      );

      const contact = await service.update("crd_123", { name: "Alice B. Smith" });
      expect(capturedBody).toEqual({ name: "Alice B. Smith" });
      expect(contact.name).toBe("Alice B. Smith");
    });

    it("supports partial updates with description only", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/contacts/crd_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(CONTACT_FIXTURE);
        }),
      );

      await service.update("crd_123", { description: "VIP customer" });
      expect(capturedBody).toEqual({ description: "VIP customer" });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe("delete", () => {
    it("sends DELETE and returns empty object on 204", async () => {
      server.use(
        http.delete(`${BASE}/contacts/crd_123`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await service.delete("crd_123");
      expect(result).toEqual({});
    });

    it("throws on error response", async () => {
      server.use(
        http.delete(`${BASE}/contacts/crd_missing`, () =>
          HttpResponse.json(
            { _error: { message: "Contact not found" } },
            { status: 404 },
          ),
        ),
      );

      await expect(service.delete("crd_missing")).rejects.toThrow("Contact not found");
    });
  });

  // ---------------------------------------------------------------------------
  // merge
  // ---------------------------------------------------------------------------
  describe("merge", () => {
    it("posts target and source contact ids to /contacts/merge", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contacts/merge`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(CONTACT_FIXTURE);
        }),
      );

      const result = await service.merge({
        target_contact_id: "crd_target",
        source_contact_id: "crd_source",
      });

      expect(capturedBody).toEqual({
        target_contact_id: "crd_target",
        source_contact_id: "crd_source",
      });
      expect(result.id).toBe("crd_123");
    });
  });

  // ---------------------------------------------------------------------------
  // listConversations
  // ---------------------------------------------------------------------------
  describe("listConversations", () => {
    it("fetches conversations for a contact", async () => {
      const conversation = { id: "cnv_1", subject: "Help!" };
      server.use(
        http.get(`${BASE}/contacts/crd_123/conversations`, () =>
          HttpResponse.json({
            _results: [conversation],
            _pagination: {},
          }),
        ),
      );

      const result = await service.listConversations("crd_123", {});
      expect(result.results).toHaveLength(1);
      expect((result.results[0] as { id: string }).id).toBe("cnv_1");
    });

    it("forwards page_token and limit", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contacts/crd_123/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listConversations("crd_123", {
        page_token: "tok_conv",
        limit: 10,
      });

      expect(capturedUrl).toContain("page_token=tok_conv");
      expect(capturedUrl).toContain("limit=10");
    });
  });

  // ---------------------------------------------------------------------------
  // addHandle
  // ---------------------------------------------------------------------------
  describe("addHandle", () => {
    it("posts handle to the correct endpoint", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contacts/crd_123/handles`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addHandle("crd_123", {
        source: "email",
        handle: "newemail@example.com",
      });

      expect(capturedBody).toEqual({
        source: "email",
        handle: "newemail@example.com",
      });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // removeHandle
  // ---------------------------------------------------------------------------
  describe("removeHandle", () => {
    it("sends DELETE to the handle-specific endpoint", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(
          `${BASE}/contacts/crd_123/handles/h_1`,
          ({ request }) => {
            capturedMethod = request.method;
            return new HttpResponse(null, { status: 204 });
          },
        ),
      );

      const result = await service.removeHandle("crd_123", "h_1");
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("throws on error response", async () => {
      server.use(
        http.delete(
          `${BASE}/contacts/crd_123/handles/h_missing`,
          () =>
            HttpResponse.json(
              { _error: { message: "Handle not found" } },
              { status: 404 },
            ),
        ),
      );

      await expect(
        service.removeHandle("crd_123", "h_missing"),
      ).rejects.toThrow("Handle not found");
    });
  });
});
