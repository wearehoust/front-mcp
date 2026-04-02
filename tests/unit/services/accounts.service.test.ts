import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { AccountsService } from "../../../src/services/accounts.service.js";
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

const sampleAccount = {
  id: "acc_123",
  name: "Acme Corp",
  description: "A test account",
  domains: ["acme.com"],
  created_at: 1700000000,
  updated_at: 1700000001,
};

const sampleContact = {
  id: "crd_abc",
  name: "Jane Doe",
};

describe("AccountsService", () => {
  let service: AccountsService;

  beforeEach(() => {
    service = new AccountsService(makeClient());
  });

  describe("list", () => {
    it("returns paginated accounts from GET /accounts", async () => {
      server.use(
        http.get(`${BASE}/accounts`, () =>
          HttpResponse.json({ _results: [sampleAccount], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("acc_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/accounts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.list({ action: "list", page_token: "tok_1", limit: 10 });
      expect(capturedUrl).toContain("page_token=tok_1");
      expect(capturedUrl).toContain("limit=10");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/accounts`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleAccount],
              _pagination: { next: `${BASE}/accounts?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleAccount, id: "acc_456" }],
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
        http.get(`${BASE}/accounts`, () =>
          HttpResponse.json({
            _results: [sampleAccount],
            _pagination: { next: `${BASE}/accounts?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns an account from GET /accounts/{id}", async () => {
      server.use(
        http.get(`${BASE}/accounts/acc_123`, () => HttpResponse.json(sampleAccount)),
      );

      const result = await service.get({ action: "get", account_id: "acc_123" });
      expect(result.id).toBe("acc_123");
      expect(result.name).toBe("Acme Corp");
    });

    it("uses the correct account_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/accounts/acc_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleAccount, id: "acc_999" });
        }),
      );

      await service.get({ action: "get", account_id: "acc_999" });
      expect(capturedUrl).toContain("/accounts/acc_999");
    });
  });

  describe("create", () => {
    it("sends POST /accounts with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/accounts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleAccount, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", name: "Acme Corp" });
      expect(capturedBody).toMatchObject({ name: "Acme Corp" });
      expect(result.id).toBe("acc_123");
    });

    it("includes optional fields when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/accounts`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleAccount, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        name: "Acme Corp",
        description: "A test account",
        domains: ["acme.com"],
        external_id: "ext_1",
      });
      expect(capturedBody).toMatchObject({
        name: "Acme Corp",
        description: "A test account",
        domains: ["acme.com"],
        external_id: "ext_1",
      });
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/accounts`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleAccount, { status: 201 });
        }),
      );

      await service.create({ action: "create", name: "Acme Corp" });
      expect(Object.keys(capturedBody)).toEqual(["name"]);
    });
  });

  describe("update", () => {
    it("sends PATCH /accounts/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/accounts/acc_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleAccount, name: "New Name" });
        }),
      );

      const result = await service.update({
        action: "update",
        account_id: "acc_123",
        name: "New Name",
      });
      expect(capturedBody).toMatchObject({ name: "New Name" });
      expect(result.name).toBe("New Name");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/accounts/acc_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleAccount);
        }),
      );

      await service.update({
        action: "update",
        account_id: "acc_123",
        description: "Updated description",
      });
      expect(capturedBody).toEqual({ description: "Updated description" });
    });
  });

  describe("delete", () => {
    it("sends DELETE /accounts/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/accounts/acc_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", account_id: "acc_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });
  });

  describe("listContacts", () => {
    it("returns contacts from GET /accounts/{id}/contacts", async () => {
      server.use(
        http.get(`${BASE}/accounts/acc_123/contacts`, () =>
          HttpResponse.json({ _results: [sampleContact], _pagination: {} }),
        ),
      );

      const result = await service.listContacts({
        action: "list_contacts",
        account_id: "acc_123",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("crd_abc");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/accounts/acc_123/contacts`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listContacts({
        action: "list_contacts",
        account_id: "acc_123",
        page_token: "cpage",
        limit: 20,
      });
      expect(capturedUrl).toContain("page_token=cpage");
      expect(capturedUrl).toContain("limit=20");
    });
  });

  describe("addContact", () => {
    it("sends POST /accounts/{id}/contacts with contact_id", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/accounts/acc_123/contacts`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.addContact({
        action: "add_contact",
        account_id: "acc_123",
        contact_id: "crd_abc",
      });
      expect(capturedBody).toMatchObject({ contact_id: "crd_abc" });
      expect(result).toEqual({});
    });
  });

  describe("removeContact", () => {
    it("sends DELETE /accounts/{id}/contacts/{contact_id}", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/accounts/acc_123/contacts/crd_abc`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.removeContact({
        action: "remove_contact",
        account_id: "acc_123",
        contact_id: "crd_abc",
      });
      expect(capturedUrl).toContain("/accounts/acc_123/contacts/crd_abc");
      expect(result).toEqual({});
    });
  });
});
