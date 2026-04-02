import { z } from "zod";
import { ConfirmParamSchema, IdSchema } from "./common.schema.js";

const AnalyticsFiltersSchema = z.record(z.string(), z.unknown());

export const AnalyticsCreateExportSchema = ConfirmParamSchema.extend({
  action: z.literal("create_export"),
  start: z.number().int(),
  end: z.number().int(),
  filters: AnalyticsFiltersSchema.optional(),
  columns: z.array(z.string()).optional(),
});

export const AnalyticsGetExportSchema = z.object({
  action: z.literal("get_export"),
  export_id: IdSchema,
});

export const AnalyticsCreateReportSchema = ConfirmParamSchema.extend({
  action: z.literal("create_report"),
  start: z.number().int(),
  end: z.number().int(),
  filters: AnalyticsFiltersSchema.optional(),
  metrics: z.array(z.string()).optional(),
});

export const AnalyticsGetReportSchema = z.object({
  action: z.literal("get_report"),
  report_uid: IdSchema,
});

export const AnalyticsSchema = z.discriminatedUnion("action", [
  AnalyticsCreateExportSchema,
  AnalyticsGetExportSchema,
  AnalyticsCreateReportSchema,
  AnalyticsGetReportSchema,
]);

export type AnalyticsInput = z.infer<typeof AnalyticsSchema>;
export type AnalyticsCreateExportInput = z.infer<typeof AnalyticsCreateExportSchema>;
export type AnalyticsGetExportInput = z.infer<typeof AnalyticsGetExportSchema>;
export type AnalyticsCreateReportInput = z.infer<typeof AnalyticsCreateReportSchema>;
export type AnalyticsGetReportInput = z.infer<typeof AnalyticsGetReportSchema>;
