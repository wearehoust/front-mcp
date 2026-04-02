import type { FrontClient } from "../client/front-client.js";
import type {
  AnalyticsCreateExportInput,
  AnalyticsGetExportInput,
  AnalyticsCreateReportInput,
  AnalyticsGetReportInput,
} from "../schemas/analytics.schema.js";

export interface AnalyticsExport {
  id: string;
  status: string;
  progress: number;
  url?: string;
  filename?: string;
  size?: number;
  created_at: number;
  [key: string]: unknown;
}

export interface AnalyticsReport {
  uid: string;
  status: string;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

export class AnalyticsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "create_export": return this.createExport(params as unknown as AnalyticsCreateExportInput);
      case "get_export": return this.getExport(params as unknown as AnalyticsGetExportInput);
      case "create_report": return this.createReport(params as unknown as AnalyticsCreateReportInput);
      case "get_report": return this.getReport(params as unknown as AnalyticsGetReportInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async createExport(input: AnalyticsCreateExportInput): Promise<AnalyticsExport> {
    const body: Record<string, unknown> = {
      start: input.start,
      end: input.end,
    };
    if (input.filters !== undefined) {
      body["filters"] = input.filters;
    }
    if (input.columns !== undefined) {
      body["columns"] = input.columns;
    }
    return this.client.post<AnalyticsExport>("/analytics/exports", body);
  }

  async getExport(input: AnalyticsGetExportInput): Promise<AnalyticsExport> {
    return this.client.get<AnalyticsExport>(`/analytics/exports/${input.export_id}`);
  }

  async createReport(input: AnalyticsCreateReportInput): Promise<AnalyticsReport> {
    const body: Record<string, unknown> = {
      start: input.start,
      end: input.end,
    };
    if (input.filters !== undefined) {
      body["filters"] = input.filters;
    }
    if (input.metrics !== undefined) {
      body["metrics"] = input.metrics;
    }
    return this.client.post<AnalyticsReport>("/analytics/reports", body);
  }

  async getReport(input: AnalyticsGetReportInput): Promise<AnalyticsReport> {
    return this.client.get<AnalyticsReport>(`/analytics/reports/${input.report_uid}`);
  }
}
