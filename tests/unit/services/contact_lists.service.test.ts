import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { ContactListsService } from "../../../src/services/contact_lists.service.js";
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

const sampleList = {
  id: "lst_123",
  name: "VIP Customers",
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleContact = {
  id: "crd_abc",
  name: "Alice Smith",
};

describe("ContactListsService", () => {
  let service: ContactListsService;

  beforeEach(() => {
    service = new ContactListsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated contact lists from GET /contact_lists", async () => {
      server.use(
        http.get(`${BASE}/contact_lists`, () =>
          HttpResponse.json({ _results: [sampleList], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("lst_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contact_lists`, ({ request }) => {
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
        http.get(`${BASE}/contact_lists`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          if (url.searchParams.get("page_token") === null) {
            return HttpResponse.json({
              _results: [sampleList],
              _pagination: { next: `${BASE}/contact_lists?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleList, id: "lst_456" }],
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
        http.get(`${BASE}/contact_lists`, () =>
          HttpResponse.json({
            _results: [sampleList],
            _pagination: { next: `${BASE}/contact_lists?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("sends POST /contact_lists with name and returns new list", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contact_lists`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleList, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "VIP Customers" });
      expect(capturedBody).toEqual({ name: "VIP Customers" });
      expect(result.id).toBe("lst_123");
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe("delete", () => {
    it("sends DELETE /contact_lists/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/contact_lists/lst_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", contact_list_id: "lst_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("uses the correct contact_list_id in path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/contact_lists/lst_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.delete({ action: "delete", contact_list_id: "lst_xyz" });
      expect(capturedUrl).toContain("/contact_lists/lst_xyz");
    });
  });

  // ---------------------------------------------------------------------------
  // listContacts
  // ---------------------------------------------------------------------------
  describe("listContacts", () => {
    it("returns contacts from GET /contact_lists/{id}/contacts", async () => {
      server.use(
        http.get(`${BASE}/contact_lists/lst_123/contacts`, () =>
          HttpResponse.json({ _results: [sampleContact], _pagination: {} }),
        ),
      );

      const result = await service.listContacts({
        action: "list_contacts",
        contact_list_id: "lst_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("crd_abc");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contact_lists/lst_123/contacts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listContacts({
        action: "list_contacts",
        contact_list_id: "lst_123",
        page_token: "ctok",
        limit: 10,
      });
      expect(capturedUrl).toContain("page_token=ctok");
      expect(capturedUrl).toContain("limit=10");
    });

    it("returns next_page_token when more contacts exist", async () => {
      server.use(
        http.get(`${BASE}/contact_lists/lst_123/contacts`, () =>
          HttpResponse.json({
            _results: [sampleContact],
            _pagination: { next: `${BASE}/contact_lists/lst_123/contacts?page_token=cnext` },
          }),
        ),
      );

      const result = await service.listContacts({
        action: "list_contacts",
        contact_list_id: "lst_123",
      });
      expect(result.next_page_token).toBe("cnext");
    });
  });

  // ---------------------------------------------------------------------------
  // addContacts
  // ---------------------------------------------------------------------------
  describe("addContacts", () => {
    it("sends POST /contact_lists/{id}/contacts with contact_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contact_lists/lst_123/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addContacts({
        action: "add_contacts",
        contact_list_id: "lst_123",
        contact_ids: ["crd_1", "crd_2"],
      });
      expect(capturedBody).toEqual({ contact_ids: ["crd_1", "crd_2"] });
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // removeContacts
  // ---------------------------------------------------------------------------
  describe("removeContacts", () => {
    it("sends DELETE /contact_lists/{id}/contacts with contact_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/contact_lists/lst_123/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeContacts({
        action: "remove_contacts",
        contact_list_id: "lst_123",
        contact_ids: ["crd_1"],
      });
      expect(capturedBody).toEqual({ contact_ids: ["crd_1"] });
      expect(result).toEqual({});
    });
  });
});
