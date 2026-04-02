import { z } from "zod";
import { PaginationParamsSchema, IdSchema } from "./common.schema.js";

export const EventsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
  types: z.array(z.string()).optional(),
  before: z.number().optional(),
  after: z.number().optional(),
});

export const EventsGetSchema = z.object({
  action: z.literal("get"),
  event_id: IdSchema,
});

export const EventsSchema = z.discriminatedUnion("action", [
  EventsListSchema,
  EventsGetSchema,
]);

export type EventsInput = z.infer<typeof EventsSchema>;
export type EventsListInput = z.infer<typeof EventsListSchema>;
export type EventsGetInput = z.infer<typeof EventsGetSchema>;
