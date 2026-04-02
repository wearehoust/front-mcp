import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { ChannelsService } from "../../../src/services/channels.service.js";
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

const sampleChannel = {
  id: "cha_123",
  type: "smtp",
  name: "Support Email",
  address: "support@acme.com",
};

describe("ChannelsService", () => {
  let service: ChannelsService;

  beforeEach(() => {
    service = new ChannelsService(makeClient());
  });

  describe("list", () => {
    it("returns channels from GET /channels", async () => {
      server.use(
        http.get(`${BASE}/channels`, () =>
          HttpResponse.json({ _results: [sampleChannel], _pagination: {} }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cha_123");
    });

    it("returns next_page_token when more pages exist", async () => {
      server.use(
        http.get(`${BASE}/channels`, () =>
          HttpResponse.json({
            _results: [sampleChannel],
            _pagination: { next: `${BASE}/channels?page_token=next_tok` },
          }),
        ),
      );

      const result = await service.list({ action: "list" });
      expect(result.next_page_token).toBe("next_tok");
    });
  });

  describe("get", () => {
    it("returns a channel from GET /channels/{id}", async () => {
      server.use(
        http.get(`${BASE}/channels/cha_123`, () => HttpResponse.json(sampleChannel)),
      );

      const result = await service.get({ action: "get", channel_id: "cha_123" });
      expect(result.id).toBe("cha_123");
      expect(result.type).toBe("smtp");
    });

    it("uses the correct channel_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/channels/cha_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleChannel, id: "cha_999" });
        }),
      );

      await service.get({ action: "get", channel_id: "cha_999" });
      expect(capturedUrl).toContain("/channels/cha_999");
    });
  });

  describe("update", () => {
    it("sends PATCH /channels/{id} with updated fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/channels/cha_123`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ...sampleChannel, name: "New Name" });
        }),
      );

      const result = await service.update({
        action: "update",
        channel_id: "cha_123",
        name: "New Name",
      });
      expect(capturedBody).toMatchObject({ name: "New Name" });
      expect(result.name).toBe("New Name");
    });

    it("sends only provided fields", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/channels/cha_123`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleChannel);
        }),
      );

      await service.update({
        action: "update",
        channel_id: "cha_123",
        settings: { send_as: "alias@acme.com" },
      });
      expect(capturedBody).toEqual({ settings: { send_as: "alias@acme.com" } });
    });
  });

  describe("validate", () => {
    it("sends POST /channels/{id}/validate", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${BASE}/channels/cha_123/validate`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ valid: true });
        }),
      );

      const result = await service.validate({ action: "validate", channel_id: "cha_123" });
      expect(capturedUrl).toContain("/channels/cha_123/validate");
      expect(result).toMatchObject({ valid: true });
    });
  });

  describe("create", () => {
    it("sends POST /channels with type", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/channels`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleChannel, { status: 201 });
        }),
      );

      const result = await service.create({ action: "create", type: "smtp" });
      expect(capturedBody).toMatchObject({ type: "smtp" });
      expect(result.id).toBe("cha_123");
    });

    it("includes optional name, settings, and inbox_id when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/channels`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleChannel, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        type: "smtp",
        name: "New Channel",
        settings: { host: "smtp.acme.com" },
        inbox_id: "inb_1",
      });
      expect(capturedBody).toMatchObject({
        type: "smtp",
        name: "New Channel",
        settings: { host: "smtp.acme.com" },
        inbox_id: "inb_1",
      });
    });
  });

  describe("listForTeammate", () => {
    it("returns channels from GET /teammates/{id}/channels", async () => {
      server.use(
        http.get(`${BASE}/teammates/tea_1/channels`, () =>
          HttpResponse.json({ _results: [sampleChannel], _pagination: {} }),
        ),
      );

      const result = await service.listForTeammate({
        action: "list_for_teammate",
        teammate_id: "tea_1",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cha_123");
    });

    it("uses the correct teammate_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teammates/tea_999/channels`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listForTeammate({ action: "list_for_teammate", teammate_id: "tea_999" });
      expect(capturedUrl).toContain("/teammates/tea_999/channels");
    });
  });

  describe("listForTeam", () => {
    it("returns channels from GET /teams/{id}/channels", async () => {
      server.use(
        http.get(`${BASE}/teams/team_1/channels`, () =>
          HttpResponse.json({ _results: [sampleChannel], _pagination: {} }),
        ),
      );

      const result = await service.listForTeam({
        action: "list_for_team",
        team_id: "team_1",
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.id).toBe("cha_123");
    });

    it("uses the correct team_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/teams/team_999/channels`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ _results: [], _pagination: {} });
        }),
      );

      await service.listForTeam({ action: "list_for_team", team_id: "team_999" });
      expect(capturedUrl).toContain("/teams/team_999/channels");
    });
  });
});
