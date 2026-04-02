import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { ContactGroupsService } from "../../../src/services/contact_groups.service.js";
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

const sampleGroup = {
  id: "grp_123",
  name: "VIP Customers",
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleContact = {
  id: "crd_abc",
  name: "Jane Doe",
};

describe("ContactGroupsService", () => {
  let service: ContactGroupsService;

  beforeEach(() => {
    service = new ContactGroupsService(makeClient());
  });

  describe("list", () => {
    it("returns paginated groups from GET /contact_groups", async () => {
      server.use(
        http.get(`${BASE}/contact_groups`, () =>
          HttpResponse.json({ _results: [sampleGroup], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("grp_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contact_groups`, ({ request }) => {
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
        http.get(`${BASE}/contact_groups`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleGroup],
              _pagination: { next: `${BASE}/contact_groups?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleGroup, id: "grp_456" }],
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
        http.get(`${BASE}/contact_groups`, () =>
          HttpResponse.json({
            _results: [sampleGroup],
            _pagination: { next: `${BASE}/contact_groups?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("create", () => {
    it("sends POST /contact_groups with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contact_groups`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleGroup, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "VIP Customers" });
      expect(capturedBody).toMatchObject({ name: "VIP Customers" });
      expect(result.id).toBe("grp_123");
    });

    it("sends only the name field", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/contact_groups`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleGroup, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "VIP Customers" });
      expect(Object.keys(capturedBody)).toEqual(["name"]);
    });
  });

  describe("delete", () => {
    it("sends DELETE /contact_groups/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/contact_groups/grp_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({
        action: "delete",
        contact_group_id: "grp_123",
      });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("uses the correct contact_group_id in the delete path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/contact_groups/grp_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.delete({ action: "delete", contact_group_id: "grp_xyz" });
      expect(capturedUrl).toContain("/contact_groups/grp_xyz");
    });
  });

  describe("listContacts", () => {
    it("returns contacts from GET /contact_groups/{id}/contacts", async () => {
      server.use(
        http.get(`${BASE}/contact_groups/grp_123/contacts`, () =>
          HttpResponse.json({ _results: [sampleContact], _pagination: {} }),
        ),
      );

      const result = await service.listContacts({
        action: "list_contacts",
        contact_group_id: "grp_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("crd_abc");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/contact_groups/grp_123/contacts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listContacts({
        action: "list_contacts",
        contact_group_id: "grp_123",
        page_token: "cpage",
        limit: 50,
      });
      expect(capturedUrl).toContain("page_token=cpage");
      expect(capturedUrl).toContain("limit=50");
    });

    it("returns next_page_token when more contacts exist", async () => {
      server.use(
        http.get(`${BASE}/contact_groups/grp_123/contacts`, () =>
          HttpResponse.json({
            _results: [sampleContact],
            _pagination: { next: `${BASE}/contact_groups/grp_123/contacts?page_token=cnext` },
          }),
        ),
      );

      const result = await service.listContacts({
        action: "list_contacts",
        contact_group_id: "grp_123",
      });
      expect(result.next_page_token).toBe("cnext");
    });
  });

  describe("addContacts", () => {
    it("sends POST /contact_groups/{id}/contacts with contact_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/contact_groups/grp_123/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addContacts({
        action: "add_contacts",
        contact_group_id: "grp_123",
        contact_ids: ["crd_1", "crd_2"],
      });
      expect(capturedBody).toMatchObject({ contact_ids: ["crd_1", "crd_2"] });
      expect(result).toEqual({});
    });
  });

  describe("removeContacts", () => {
    it("sends DELETE /contact_groups/{id}/contacts with contact_ids", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/contact_groups/grp_123/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeContacts({
        action: "remove_contacts",
        contact_group_id: "grp_123",
        contact_ids: ["crd_1", "crd_2"],
      });
      expect(capturedBody).toMatchObject({ contact_ids: ["crd_1", "crd_2"] });
      expect(result).toEqual({});
    });
  });
});
