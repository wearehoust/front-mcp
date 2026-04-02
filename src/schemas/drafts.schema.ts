import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const DraftsListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
  conversation_id: IdSchema,
});

export const DraftsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  conversation_id: IdSchema,
  author_id: z.string().min(1),
  body: z.string().min(1),
  subject: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  channel_id: z.string().optional(),
  mode: z.enum(["private", "shared"]).optional(),
});

export const DraftsCreateReplySchema = ConfirmParamSchema.extend({
  action: z.literal("create_reply"),
  conversation_id: IdSchema,
  author_id: z.string().min(1),
  body: z.string().min(1),
  channel_id: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  mode: z.enum(["private", "shared"]).optional(),
});

export const DraftsUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  draft_id: IdSchema,
  author_id: z.string().min(1),
  body: z.string().optional(),
  subject: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  mode: z.enum(["private", "shared"]).optional(),
});

export const DraftsDeleteSchema = ConfirmParamSchema.extend({
  action: z.literal("delete"),
  draft_id: IdSchema,
});

export const DraftsSchema = z.discriminatedUnion("action", [
  DraftsListSchema,
  DraftsCreateSchema,
  DraftsCreateReplySchema,
  DraftsUpdateSchema,
  DraftsDeleteSchema,
]);

export type DraftsInput = z.infer<typeof DraftsSchema>;
export type DraftsListInput = z.infer<typeof DraftsListSchema>;
export type DraftsCreateInput = z.infer<typeof DraftsCreateSchema>;
export type DraftsCreateReplyInput = z.infer<typeof DraftsCreateReplySchema>;
export type DraftsUpdateInput = z.infer<typeof DraftsUpdateSchema>;
export type DraftsDeleteInput = z.infer<typeof DraftsDeleteSchema>;
