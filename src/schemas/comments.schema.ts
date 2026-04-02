import { z } from "zod";
import { ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const CommentsListSchema = z.object({
  action: z.literal("list"),
  conversation_id: IdSchema,
});

export const CommentsGetSchema = z.object({
  action: z.literal("get"),
  comment_id: IdSchema,
});

export const CommentsCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  conversation_id: IdSchema,
  body: z.string().min(1),
  author_id: z.string().optional(),
});

export const CommentsUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  comment_id: IdSchema,
  body: z.string().min(1),
});

export const CommentsListMentionsSchema = z.object({
  action: z.literal("list_mentions"),
  comment_id: IdSchema,
});

export const CommentsReplySchema = ConfirmParamSchema.extend({
  action: z.literal("reply"),
  comment_id: IdSchema,
  body: z.string().min(1),
  author_id: z.string().optional(),
});

export const CommentsSchema = z.discriminatedUnion("action", [
  CommentsListSchema,
  CommentsGetSchema,
  CommentsCreateSchema,
  CommentsUpdateSchema,
  CommentsListMentionsSchema,
  CommentsReplySchema,
]);

export type CommentsInput = z.infer<typeof CommentsSchema>;
export type CommentsListInput = z.infer<typeof CommentsListSchema>;
export type CommentsGetInput = z.infer<typeof CommentsGetSchema>;
export type CommentsCreateInput = z.infer<typeof CommentsCreateSchema>;
export type CommentsUpdateInput = z.infer<typeof CommentsUpdateSchema>;
export type CommentsListMentionsInput = z.infer<typeof CommentsListMentionsSchema>;
export type CommentsReplyInput = z.infer<typeof CommentsReplySchema>;
