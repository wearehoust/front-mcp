import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { AnalyticsService } from "../../../src/services/analytics.service.js";
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

const sampleExport = {
  id: "exp_123",
  status: "pending",
  progress: 0,
  created_at: 1700000000,
};

const sampleReport = {
  uid: "rpt_abc",
  status: "done",
  metrics: { total_conversations: 42 },
};

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService(makeClient());
  });

  describe("createExport", () => {
    it("sends POST /analytics/exports with start and end", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/analytics/exports`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleExport, { status: 201 });
        }),
      );

      const result = await service.createExport({
        action: "create_export",
        start: 1700000000,
        end: 1700086400,
      });
      expect(capturedBody).toMatchObject({ start: 1700000000, end: 1700086400 });
      expect(result.id).toBe("exp_123");
    });

    it("includes optional filters and columns when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/analytics/exports`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleExport, { status: 201 });
        }),
      );

      await service.createExport({
        action: "create_export",
        start: 1700000000,
        end: 1700086400,
        filters: { tag_ids: ["tag_1"] },
        columns: ["date", "count"],
      });
      expect(capturedBody).toMatchObject({
        filters: { tag_ids: ["tag_1"] },
        columns: ["date", "count"],
      });
    });

    it("omits optional fields when not provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${BASE}/analytics/exports`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(sampleExport, { status: 201 });
        }),
      );

      await service.createExport({
        action: "create_export",
        start: 1700000000,
        end: 1700086400,
      });
      expect(Object.keys(capturedBody)).toEqual(["start", "end"]);
    });
  });

  describe("getExport", () => {
    it("returns an export from GET /analytics/exports/{id}", async () => {
      server.use(
        http.get(`${BASE}/analytics/exports/exp_123`, () =>
          HttpResponse.json(sampleExport),
        ),
      );

      const result = await service.getExport({ action: "get_export", export_id: "exp_123" });
      expect(result.id).toBe("exp_123");
      expect(result.status).toBe("pending");
    });

    it("uses the correct export_id in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/analytics/exports/exp_999`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleExport, id: "exp_999" });
        }),
      );

      await service.getExport({ action: "get_export", export_id: "exp_999" });
      expect(capturedUrl).toContain("/analytics/exports/exp_999");
    });
  });

  describe("createReport", () => {
    it("sends POST /analytics/reports with start and end", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/analytics/reports`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleReport, { status: 201 });
        }),
      );

      const result = await service.createReport({
        action: "create_report",
        start: 1700000000,
        end: 1700086400,
      });
      expect(capturedBody).toMatchObject({ start: 1700000000, end: 1700086400 });
      expect(result.uid).toBe("rpt_abc");
    });

    it("includes optional filters and metrics when provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE}/analytics/reports`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(sampleReport, { status: 201 });
        }),
      );

      await service.createReport({
        action: "create_report",
        start: 1700000000,
        end: 1700086400,
        filters: { inbox_ids: ["inb_1"] },
        metrics: ["num_conversations_open"],
      });
      expect(capturedBody).toMatchObject({
        filters: { inbox_ids: ["inb_1"] },
        metrics: ["num_conversations_open"],
      });
    });
  });

  describe("getReport", () => {
    it("returns a report from GET /analytics/reports/{uid}", async () => {
      server.use(
        http.get(`${BASE}/analytics/reports/rpt_abc`, () =>
          HttpResponse.json(sampleReport),
        ),
      );

      const result = await service.getReport({ action: "get_report", report_uid: "rpt_abc" });
      expect(result.uid).toBe("rpt_abc");
      expect(result.status).toBe("done");
    });

    it("uses the correct report_uid in the URL path", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${BASE}/analytics/reports/rpt_xyz`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ...sampleReport, uid: "rpt_xyz" });
        }),
      );

      await service.getReport({ action: "get_report", report_uid: "rpt_xyz" });
      expect(capturedUrl).toContain("/analytics/reports/rpt_xyz");
    });
  });
});
