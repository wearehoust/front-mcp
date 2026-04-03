import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { CustomFieldsService } from "../../../src/services/custom_fields.service.js";
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

const sampleField = {
  id: "cf_123",
  name: "Priority",
  type: "string",
  description: "Customer priority level",
};

describe("CustomFieldsService", () => {
  let service: CustomFieldsService;

  beforeEach(() => {
    service = new CustomFieldsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // listForAccounts
  // ---------------------------------------------------------------------------
  describe("listForAccounts", () => {
    it("returns fields from GET /accounts/custom_fields", async () => {
      server.use(
        http.get(`${BASE}/accounts/custom_fields`, () =>
          HttpResponse.json({ _results: [sampleField], _pagination: {} }),
        ),
      );

      const result = await service.listForAccounts({
        action: "list_for_accounts",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cf_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/accounts/custom_fields`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listForAccounts({
        action: "list_for_accounts",
        page_token: "tok_cf",
        limit: 20,
      });
      expect(capturedUrl).toContain("page_token=tok_cf");
      expect(capturedUrl).toContain("limit=20");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/accounts/custom_fields`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          if (url.searchParams.get("page_token") === null) {
            return HttpResponse.json({
              _results: [sampleField],
              _pagination: { next: `${BASE}/accounts/custom_fields?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleField, id: "cf_456" }],
            _pagination: {},
          });
        }),
      );

      const result = await service.listForAccounts({
        action: "list_for_accounts",
        auto_paginate: true,
      });
      expect(callCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // listForContacts
  // ---------------------------------------------------------------------------
  describe("listForContacts", () => {
    it("returns fields from GET /contacts/custom_fields", async () => {
      server.use(
        http.get(`${BASE}/contacts/custom_fields`, () =>
          HttpResponse.json({ _results: [sampleField], _pagination: {} }),
        ),
      );

      const result = await service.listForContacts({ action: "list_for_contacts" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.name).toBe("Priority");
    });
  });

  // ---------------------------------------------------------------------------
  // listForConversations
  // ---------------------------------------------------------------------------
  describe("listForConversations", () => {
    it("returns fields from GET /conversations/custom_fields", async () => {
      server.use(
        http.get(`${BASE}/conversations/custom_fields`, () =>
          HttpResponse.json({ _results: [sampleField], _pagination: {} }),
        ),
      );

      const result = await service.listForConversations({ action: "list_for_conversations" });
      expect(result.results).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // listForInboxes
  // ---------------------------------------------------------------------------
  describe("listForInboxes", () => {
    it("returns fields from GET /inboxes/custom_fields", async () => {
      server.use(
        http.get(`${BASE}/inboxes/custom_fields`, () =>
          HttpResponse.json({ _results: [sampleField], _pagination: {} }),
        ),
      );

      const result = await service.listForInboxes({
        action: "list_for_inboxes",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cf_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/inboxes/custom_fields`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listForInboxes({
        action: "list_for_inboxes",
        page_token: "itok",
        limit: 15,
      });
      expect(capturedUrl).toContain("page_token=itok");
      expect(capturedUrl).toContain("limit=15");
    });
  });

  // ---------------------------------------------------------------------------
  // listForLinks
  // ---------------------------------------------------------------------------
  describe("listForLinks", () => {
    it("returns fields from GET /links/custom_fields", async () => {
      server.use(
        http.get(`${BASE}/links/custom_fields`, () =>
          HttpResponse.json({ _results: [sampleField], _pagination: {} }),
        ),
      );

      const result = await service.listForLinks({ action: "list_for_links" });
      expect(result.results).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // listForTeammates
  // ---------------------------------------------------------------------------
  describe("listForTeammates", () => {
    it("returns fields from GET /teammates/custom_fields", async () => {
      server.use(
        http.get(`${BASE}/teammates/custom_fields`, () =>
          HttpResponse.json({ _results: [sampleField], _pagination: {} }),
        ),
      );

      const result = await service.listForTeammates({
        action: "list_for_teammates",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cf_123");
    });

    it("returns next_page_token when more results exist", async () => {
      server.use(
        http.get(`${BASE}/teammates/custom_fields`, () =>
          HttpResponse.json({
            _results: [sampleField],
            _pagination: { next: `${BASE}/teammates/custom_fields?page_token=tnext` },
          }),
        ),
      );

      const result = await service.listForTeammates({
        action: "list_for_teammates",
      });
      expect(result.next_page_token).toBe("tnext");
    });
  });
});
