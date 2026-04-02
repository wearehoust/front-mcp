import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { FrontClient, ApiTokenAuth } from "../../../src/client/front-client.js";
import { RateLimiter } from "../../../src/client/rate-limiter.js";
import { Logger } from "../../../src/utils/logger.js";
import { ConversationsService } from "../../../src/services/conversations.service.js";

const BASE = "https://api2.frontapp.com";

function makeClient(): FrontClient {
  const auth = new ApiTokenAuth("test_token");
  const rateLimiter = new RateLimiter();
  const logger = new Logger("error");
  return new FrontClient(auth, { rateLimiter, logger, retryOptions: { maxRetries: 0 } });
}

function makePaginatedResponse<T>(results: T[], nextUrl?: string) {
  return {
    _results: results,
    _pagination: nextUrl !== undefined ? { next: nextUrl } : {},
  };
}

const CONV = { id: "cnv_1", subject: "Hello" };
const CONV_2 = { id: "cnv_2", subject: "World" };
const TEAMMATE = { id: "tea_1" };
const INBOX = { id: "inb_1" };
const MESSAGE = { id: "msg_1" };
const EVENT = { id: "evt_1" };

describe("ConversationsService", () => {
  let service: ConversationsService;

  beforeEach(() => {
    service = new ConversationsService(makeClient());
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------

  describe("list", () => {
    it("returns a page of conversations", async () => {
      server.use(
        http.get(`${BASE}/conversations`, () =>
          HttpResponse.json(makePaginatedResponse([CONV, CONV_2])),
        ),
      );

      const result = await service.execute({ action: "list" });
      expect(result).toMatchObject({ results: [CONV, CONV_2] });
    });

    it("passes statuses as query param", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(makePaginatedResponse([CONV]));
        }),
      );

      await service.execute({ action: "list", statuses: ["open", "assigned"] });
      expect(capturedUrl).toContain("q%5Bstatuses%5D%5B%5D=open%2Cassigned");
    });

    it("passes limit and page_token", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/conversations`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(makePaginatedResponse([]));
        }),
      );

      await service.execute({ action: "list", limit: 10, page_token: "tok_abc" });
      expect(capturedUrl).toContain("limit=10");
      expect(capturedUrl).toContain("page_token=tok_abc");
    });

    it("auto-paginates when auto_paginate is true", async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/conversations`, ({ request }) => {
          callCount++;
          const url = new URL(request.url);
          const token = url.searchParams.get("page_token");
          if (token === null) {
            return HttpResponse.json(
              makePaginatedResponse([CONV], `${BASE}/conversations?page_token=tok_p2`),
            );
          }
          return HttpResponse.json(makePaginatedResponse([CONV_2]));
        }),
      );

      const result = await service.execute({ action: "list", auto_paginate: true });
      expect(callCount).toBe(2);
      expect(result).toMatchObject({ results: [CONV, CONV_2] });
    });

    it("exposes next_page_token when more pages exist", async () => {
      server.use(
        http.get(`${BASE}/conversations`, () =>
          HttpResponse.json(
            makePaginatedResponse([CONV], `${BASE}/conversations?page_token=tok_next`),
          ),
        ),
      );

      const result = await service.execute({ action: "list" });
      expect(result).toMatchObject({ next_page_token: "tok_next" });
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------

  describe("get", () => {
    it("returns the conversation by id", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_1`, () => HttpResponse.json(CONV)),
      );

      const result = await service.execute({ action: "get", conversation_id: "cnv_1" });
      expect(result).toEqual(CONV);
    });
  });

  // ---------------------------------------------------------------------------
  // search
  // ---------------------------------------------------------------------------

  describe("search", () => {
    it("searches conversations with a query string", async () => {
      server.use(
        http.get(`${BASE}/conversations/search/hello%20world`, () =>
          HttpResponse.json(makePaginatedResponse([CONV])),
        ),
      );

      const result = await service.execute({ action: "search", query: "hello world" });
      expect(result).toMatchObject({ results: [CONV] });
    });

    it("passes limit to search endpoint", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/conversations/search/test`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(makePaginatedResponse([]));
        }),
      );

      await service.execute({ action: "search", query: "test", limit: 5 });
      expect(capturedUrl).toContain("limit=5");
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("posts to /conversations and returns created conversation", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ id: "cnv_new", subject: "New" }, { status: 201 });
        }),
      );

      const result = await service.execute({
        action: "create",
        subject: "New",
        type: "discussion",
        confirm: true,
      });

      expect(capturedBody).toMatchObject({ subject: "New", type: "discussion" });
      expect(result).toMatchObject({ id: "cnv_new" });
    });

    it("omits undefined fields from POST body", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/conversations`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ id: "cnv_new" });
        }),
      );

      await service.execute({ action: "create", confirm: true });
      expect(capturedBody).not.toHaveProperty("subject");
      expect(capturedBody).not.toHaveProperty("type");
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe("update", () => {
    it("patches the conversation with provided fields", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/conversations/cnv_1`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ id: "cnv_1", status: "archived" });
        }),
      );

      const result = await service.execute({
        action: "update",
        conversation_id: "cnv_1",
        status: "archived",
        confirm: true,
      });

      expect(capturedBody).toMatchObject({ status: "archived" });
      expect(result).toMatchObject({ id: "cnv_1" });
    });
  });

  // ---------------------------------------------------------------------------
  // delete (soft-delete via PATCH status=deleted)
  // ---------------------------------------------------------------------------

  describe("delete", () => {
    it("patches conversation status to deleted", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/conversations/cnv_1`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({});
        }),
      );

      await service.execute({
        action: "delete",
        conversation_id: "cnv_1",
        confirm: true,
      });

      expect(capturedBody).toEqual({ status: "deleted" });
    });
  });

  // ---------------------------------------------------------------------------
  // assign
  // ---------------------------------------------------------------------------

  describe("assign", () => {
    it("puts assignee_id to the assignee endpoint", async () => {
      let capturedBody: unknown;
      server.use(
        http.put(`${BASE}/conversations/cnv_1/assignee`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({});
        }),
      );

      await service.execute({
        action: "assign",
        conversation_id: "cnv_1",
        assignee_id: "tea_1",
        confirm: true,
      });

      expect(capturedBody).toEqual({ assignee_id: "tea_1" });
    });

    it("sends empty body when assignee_id is omitted (unassign)", async () => {
      let capturedBody: unknown;
      server.use(
        http.put(`${BASE}/conversations/cnv_1/assignee`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({});
        }),
      );

      await service.execute({
        action: "assign",
        conversation_id: "cnv_1",
        confirm: true,
      });

      expect(capturedBody).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // list_events
  // ---------------------------------------------------------------------------

  describe("list_events", () => {
    it("returns events for a conversation", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_1/events`, () =>
          HttpResponse.json(makePaginatedResponse([EVENT])),
        ),
      );

      const result = await service.execute({
        action: "list_events",
        conversation_id: "cnv_1",
      });

      expect(result).toMatchObject({ results: [EVENT] });
    });
  });

  // ---------------------------------------------------------------------------
  // list_followers
  // ---------------------------------------------------------------------------

  describe("list_followers", () => {
    it("returns followers for a conversation", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_1/followers`, () =>
          HttpResponse.json(makePaginatedResponse([TEAMMATE])),
        ),
      );

      const result = await service.execute({
        action: "list_followers",
        conversation_id: "cnv_1",
      });

      expect(result).toMatchObject({ results: [TEAMMATE] });
    });
  });

  // ---------------------------------------------------------------------------
  // add_followers
  // ---------------------------------------------------------------------------

  describe("add_followers", () => {
    it("posts teammate_ids to the followers endpoint", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/followers`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.execute({
        action: "add_followers",
        conversation_id: "cnv_1",
        teammate_ids: ["tea_1", "tea_2"],
        confirm: true,
      });

      expect(capturedBody).toEqual({ teammate_ids: ["tea_1", "tea_2"] });
    });
  });

  // ---------------------------------------------------------------------------
  // remove_followers
  // ---------------------------------------------------------------------------

  describe("remove_followers", () => {
    it("deletes followers with teammate_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/conversations/cnv_1/followers`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.execute({
        action: "remove_followers",
        conversation_id: "cnv_1",
        teammate_ids: ["tea_1"],
        confirm: true,
      });

      expect(capturedBody).toEqual({ teammate_ids: ["tea_1"] });
    });
  });

  // ---------------------------------------------------------------------------
  // list_inboxes
  // ---------------------------------------------------------------------------

  describe("list_inboxes", () => {
    it("returns inboxes for a conversation", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_1/inboxes`, () =>
          HttpResponse.json(makePaginatedResponse([INBOX])),
        ),
      );

      const result = await service.execute({
        action: "list_inboxes",
        conversation_id: "cnv_1",
      });

      expect(result).toMatchObject({ results: [INBOX] });
    });
  });

  // ---------------------------------------------------------------------------
  // add_link
  // ---------------------------------------------------------------------------

  describe("add_link", () => {
    it("posts link_id to the links endpoint", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/links`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.execute({
        action: "add_link",
        conversation_id: "cnv_1",
        link_id: "lnk_1",
        confirm: true,
      });

      expect(capturedBody).toEqual({ link_id: "lnk_1" });
    });
  });

  // ---------------------------------------------------------------------------
  // remove_links
  // ---------------------------------------------------------------------------

  describe("remove_links", () => {
    it("deletes links with link_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/conversations/cnv_1/links`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.execute({
        action: "remove_links",
        conversation_id: "cnv_1",
        link_ids: ["lnk_1", "lnk_2"],
        confirm: true,
      });

      expect(capturedBody).toEqual({ link_ids: ["lnk_1", "lnk_2"] });
    });
  });

  // ---------------------------------------------------------------------------
  // list_messages
  // ---------------------------------------------------------------------------

  describe("list_messages", () => {
    it("returns messages for a conversation", async () => {
      server.use(
        http.get(`${BASE}/conversations/cnv_1/messages`, () =>
          HttpResponse.json(makePaginatedResponse([MESSAGE])),
        ),
      );

      const result = await service.execute({
        action: "list_messages",
        conversation_id: "cnv_1",
      });

      expect(result).toMatchObject({ results: [MESSAGE] });
    });

    it("passes limit query param", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/conversations/cnv_1/messages`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(makePaginatedResponse([]));
        }),
      );

      await service.execute({
        action: "list_messages",
        conversation_id: "cnv_1",
        limit: 25,
      });

      expect(capturedUrl).toContain("limit=25");
    });
  });

  // ---------------------------------------------------------------------------
  // update_reminders
  // ---------------------------------------------------------------------------

  describe("update_reminders", () => {
    it("patches reminders with teammate_id and scheduled_at", async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE}/conversations/cnv_1/reminders`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({});
        }),
      );

      await service.execute({
        action: "update_reminders",
        conversation_id: "cnv_1",
        teammate_id: "tea_1",
        scheduled_at: "2024-01-01T09:00:00Z",
        confirm: true,
      });

      expect(capturedBody).toEqual({
        teammate_id: "tea_1",
        scheduled_at: "2024-01-01T09:00:00Z",
      });
    });

    it("omits scheduled_at when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.patch(`${BASE}/conversations/cnv_1/reminders`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({});
        }),
      );

      await service.execute({
        action: "update_reminders",
        conversation_id: "cnv_1",
        teammate_id: "tea_1",
        confirm: true,
      });

      expect(capturedBody).toEqual({ teammate_id: "tea_1" });
      expect(capturedBody).not.toHaveProperty("scheduled_at");
    });
  });

  // ---------------------------------------------------------------------------
  // add_tag
  // ---------------------------------------------------------------------------

  describe("add_tag", () => {
    it("posts tag_id to the tags endpoint", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/conversations/cnv_1/tags`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.execute({
        action: "add_tag",
        conversation_id: "cnv_1",
        tag_id: "tag_1",
        confirm: true,
      });

      expect(capturedBody).toEqual({ tag_id: "tag_1" });
    });
  });

  // ---------------------------------------------------------------------------
  // remove_tag
  // ---------------------------------------------------------------------------

  describe("remove_tag", () => {
    it("deletes tags with tag_ids in body", async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${BASE}/conversations/cnv_1/tags`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await service.execute({
        action: "remove_tag",
        conversation_id: "cnv_1",
        tag_ids: ["tag_1", "tag_2"],
        confirm: true,
      });

      expect(capturedBody).toEqual({ tag_ids: ["tag_1", "tag_2"] });
    });
  });
});
