import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { FrontClient, ApiTokenAuth } from "../../../src/client/front-client.js";
import { RateLimiter } from "../../../src/client/rate-limiter.js";
import { Logger } from "../../../src/utils/logger.js";
import { MessagesService } from "../../../src/services/messages.service.js";

function makeClient(): FrontClient {
  return new FrontClient(new ApiTokenAuth("test_token"), {
    rateLimiter: new RateLimiter(),
    logger: new Logger("error"),
    retryOptions: { maxRetries: 0 },
  });
}

const BASE = "https://api2.frontapp.com";

const stubMessage = {
  id: "msg_123",
  type: "email",
  body: "Hello",
  created_at: 1700000000,
};

describe("MessagesService", () => {
  let service: MessagesService;

  beforeEach(() => {
    service = new MessagesService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("calls GET /messages/{id} and returns the message", async () => {
      server.use(
        http.get(`${BASE}/messages/msg_123`, () =>
          HttpResponse.json(stubMessage),
        ),
      );

      const result = await service.get({ action: "get", message_id: "msg_123" });
      expect(result.id).toBe("msg_123");
      expect(result.type).toBe("email");
    });

    it("passes the correct message_id in the URL", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/messages/msg_abc`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...stubMessage, id: "msg_abc" });
        }),
      );

      await service.get({ action: "get", message_id: "msg_abc" });
      expect(capturedUrl).toContain("/messages/msg_abc");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("calls POST /conversations/{id}/messages with body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/messages`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_1",
        body: "Hello",
      });

      expect(capturedBody).toMatchObject({ body: "Hello" });
    });

    it("includes optional type and options when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/messages`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_1",
        body: "Hello",
        type: "email",
        options: { tags: ["tag_1"] },
        confirm: true,
      });

      expect(capturedBody).toMatchObject({
        body: "Hello",
        type: "email",
        options: { tags: ["tag_1"] },
      });
    });

    it("omits type when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/conversations/cnv_2/messages`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.create({
        action: "create",
        conversation_id: "cnv_2",
        body: "Hi",
      });

      expect(capturedBody).not.toHaveProperty("type");
    });
  });

  // ---------------------------------------------------------------------------
  // reply
  // ---------------------------------------------------------------------------
  describe("reply", () => {
    it("calls POST /conversations/{id}/messages with type=reply", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/messages`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.reply({
        action: "reply",
        conversation_id: "cnv_1",
        body: "Reply text",
      });

      expect(capturedBody).toMatchObject({ body: "Reply text", type: "reply" });
    });

    it("includes options when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/messages`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.reply({
        action: "reply",
        conversation_id: "cnv_1",
        body: "Reply text",
        options: { draft_mode: true },
        confirm: false,
      });

      expect(capturedBody).toMatchObject({
        body: "Reply text",
        type: "reply",
        options: { draft_mode: true },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // import
  // ---------------------------------------------------------------------------
  describe("import", () => {
    it("calls POST /inboxes/{inbox_id}/imported_messages", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/inboxes/inb_1/imported_messages`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.import({
        action: "import",
        inbox_id: "inb_1",
        body: "Imported message",
        sender: { handle: "user@example.com", name: "User" },
      });

      expect(capturedUrl).toContain("/inboxes/inb_1/imported_messages");
      expect(capturedBody).toMatchObject({
        body: "Imported message",
        sender: { handle: "user@example.com", name: "User" },
      });
    });

    it("includes optional metadata when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/inboxes/inb_1/imported_messages`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.import({
        action: "import",
        inbox_id: "inb_1",
        body: "Imported message",
        sender: { handle: "user@example.com" },
        metadata: { external_id: "ext_999" },
        confirm: true,
      });

      expect(capturedBody).toMatchObject({
        metadata: { external_id: "ext_999" },
      });
    });

    it("omits metadata when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/inboxes/inb_2/imported_messages`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.import({
        action: "import",
        inbox_id: "inb_2",
        body: "Hi",
        sender: { handle: "a@b.com" },
      });

      expect(capturedBody).not.toHaveProperty("metadata");
    });
  });

  // ---------------------------------------------------------------------------
  // receive_custom
  // ---------------------------------------------------------------------------
  describe("receiveCustom", () => {
    it("calls POST /channels/{channel_id}/messages", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/channels/cha_1/messages`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return HttpResponse.json(stubMessage, { status: 201 });
        }),
      );

      await service.receiveCustom({
        action: "receive_custom",
        channel_id: "cha_1",
        body: "Custom message",
        sender: { handle: "+15551234567", name: "Alice" },
      });

      expect(capturedUrl).toContain("/channels/cha_1/messages");
      expect(capturedBody).toMatchObject({
        body: "Custom message",
        sender: { handle: "+15551234567", name: "Alice" },
      });
    });

    it("works with confirm flag", async () => {
      server.use(
        http.post(`${BASE}/channels/cha_2/messages`, async () =>
          HttpResponse.json(stubMessage, { status: 201 }),
        ),
      );

      const result = await service.receiveCustom({
        action: "receive_custom",
        channel_id: "cha_2",
        body: "Hi",
        sender: { handle: "bot@example.com" },
        confirm: true,
      });

      expect(result.id).toBe("msg_123");
    });
  });

  // ---------------------------------------------------------------------------
  // get_seen_status
  // ---------------------------------------------------------------------------
  describe("getSeenStatus", () => {
    it("calls GET /messages/{id}/seen and returns seen status", async () => {
      const stubSeen = {
        data: [{ teammate: { id: "tea_1" }, first_seen_at: 1700000001 }],
      };
      server.use(
        http.get(`${BASE}/messages/msg_123/seen`, () =>
          HttpResponse.json(stubSeen),
        ),
      );

      const result = await service.getSeenStatus({
        action: "get_seen_status",
        message_id: "msg_123",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.teammate.id).toBe("tea_1");
    });

    it("passes the correct message_id in the URL", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/messages/msg_xyz/seen`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: [] });
        }),
      );

      await service.getSeenStatus({
        action: "get_seen_status",
        message_id: "msg_xyz",
      });

      expect(capturedUrl).toContain("/messages/msg_xyz/seen");
    });
  });

  // ---------------------------------------------------------------------------
  // mark_seen
  // ---------------------------------------------------------------------------
  describe("markSeen", () => {
    it("calls POST /messages/{id}/seen", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${BASE}/messages/msg_123/seen`, ({ request }) => {
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await service.markSeen({
        action: "mark_seen",
        message_id: "msg_123",
      });

      expect(capturedUrl).toContain("/messages/msg_123/seen");
      expect(result).toEqual({});
    });

    it("works with confirm flag", async () => {
      server.use(
        http.post(`${BASE}/messages/msg_456/seen`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await service.markSeen({
        action: "mark_seen",
        message_id: "msg_456",
        confirm: true,
      });

      expect(result).toEqual({});
    });
  });
});
