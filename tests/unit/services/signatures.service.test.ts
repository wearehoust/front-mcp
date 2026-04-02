import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { SignaturesService } from "../../../src/services/signatures.service.js";
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

const sampleSignature = {
  id: "sig_123",
  name: "My Signature",
  body: "<p>Best regards</p>",
  sender_info: null,
  is_visible_for_all_teammate_channels: true,
  is_default: false,
};

describe("SignaturesService", () => {
  let service: SignaturesService;

  beforeEach(() => {
    service = new SignaturesService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated signatures from GET /signatures", async () => {
      server.use(
        http.get(`${BASE}/signatures`, () =>
          HttpResponse.json({ _results: [sampleSignature], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("sig_123");
    });

    it("passes page_token and limit as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/signatures`, ({ request }) => {
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
        http.get(`${BASE}/signatures`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const pageToken = url.searchParams.get("page_token");
          if (pageToken === null) {
            return HttpResponse.json({
              _results: [sampleSignature],
              _pagination: { next: `${BASE}/signatures?page_token=page2` },
            });
          }
          return HttpResponse.json({
            _results: [{ ...sampleSignature, id: "sig_456" }],
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
        http.get(`${BASE}/signatures`, () =>
          HttpResponse.json({
            _results: [sampleSignature],
            _pagination: { next: `${BASE}/signatures?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("returns a signature from GET /signatures/{id}", async () => {
      server.use(
        http.get(`${BASE}/signatures/sig_123`, () => HttpResponse.json(sampleSignature)),
      );

      const result = await service.get({ action: "get", signature_id: "sig_123" });
      expect(result.id).toBe("sig_123");
      expect(result.name).toBe("My Signature");
    });

    it("uses the correct signature_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/signatures/sig_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleSignature, id: "sig_999" });
        }),
      );

      await service.get({ action: "get", signature_id: "sig_999" });
      expect(capturedUrl).toContain("/signatures/sig_999");
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("sends PATCH /signatures/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/signatures/sig_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleSignature, name: "Updated Sig" });
        }),
      );

      const result = await service.update({
        action: "update",
        signature_id: "sig_123",
        name: "Updated Sig",
      });
      expect(capturedBody).toMatchObject({ name: "Updated Sig" });
      expect(result.name).toBe("Updated Sig");
    });

    it("sends only provided optional fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/signatures/sig_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleSignature);
        }),
      );

      await service.update({
        action: "update",
        signature_id: "sig_123",
        is_default: true,
      });
      expect(capturedBody).toEqual({ is_default: true });
    });

    it("includes channel_ids when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/signatures/sig_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleSignature);
        }),
      );

      await service.update({
        action: "update",
        signature_id: "sig_123",
        channel_ids: ["cha_1", "cha_2"],
      });
      expect(capturedBody).toMatchObject({ channel_ids: ["cha_1", "cha_2"] });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe("delete", () => {
    it("sends DELETE /signatures/{id} and returns empty object", async () => {
      let capturedMethod = "";
      server.use(
        http.delete(`${BASE}/signatures/sig_123`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.delete({ action: "delete", signature_id: "sig_123" });
      expect(capturedMethod).toBe("DELETE");
      expect(result).toEqual({});
    });

    it("uses the correct signature_id in the delete path", async () => {
      let capturedUrl = "";
      server.use(
        http.delete(`${BASE}/signatures/sig_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.delete({ action: "delete", signature_id: "sig_xyz" });
      expect(capturedUrl).toContain("/signatures/sig_xyz");
    });
  });

  // ---------------------------------------------------------------------------
  // createForTeammate
  // ---------------------------------------------------------------------------
  describe("createForTeammate", () => {
    it("sends POST /teammates/{id}/signatures with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teammates/tea_1/signatures`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleSignature, { status: 201 });
        }),
      );

      const result = await service.createForTeammate({
        action: "create_for_teammate",
        teammate_id: "tea_1",
        name: "My Signature",
      });
      expect(capturedBody).toMatchObject({ name: "My Signature" });
      expect(result.id).toBe("sig_123");
    });

    it("includes optional body and is_default when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teammates/tea_1/signatures`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleSignature, { status: 201 });
        }),
      );

      await service.createForTeammate({
        action: "create_for_teammate",
        teammate_id: "tea_1",
        name: "My Signature",
        body: "<p>Regards</p>",
        is_default: true,
      });
      expect(capturedBody).toMatchObject({
        name: "My Signature",
        body: "<p>Regards</p>",
        is_default: true,
      });
    });

    it("uses the correct teammate_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${BASE}/teammates/tea_abc/signatures`, async ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(sampleSignature, { status: 201 });
        }),
      );

      await service.createForTeammate({
        action: "create_for_teammate",
        teammate_id: "tea_abc",
        name: "My Signature",
      });
      expect(capturedUrl).toContain("/teammates/tea_abc/signatures");
    });
  });

  // ---------------------------------------------------------------------------
  // createForTeam
  // ---------------------------------------------------------------------------
  describe("createForTeam", () => {
    it("sends POST /teams/{id}/signatures with name", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/teams/team_1/signatures`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleSignature, { status: 201 });
        }),
      );

      const result = await service.createForTeam({
        action: "create_for_team",
        team_id: "team_1",
        name: "Team Signature",
      });
      expect(capturedBody).toMatchObject({ name: "Team Signature" });
      expect(result.id).toBe("sig_123");
    });

    it("uses the correct team_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${BASE}/teams/team_abc/signatures`, async ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(sampleSignature, { status: 201 });
        }),
      );

      await service.createForTeam({
        action: "create_for_team",
        team_id: "team_abc",
        name: "Team Signature",
      });
      expect(capturedUrl).toContain("/teams/team_abc/signatures");
    });
  });
});
