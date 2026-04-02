import { z } from "zod";
import { ConfirmParamSchema, IdSchema } from "./common.schema.js";

const SenderSchema = z.object({
  handle: z.string(),
  name: z.string().optional(),
});

const MessageOptionsSchema = z.record(z.string(), z.unknown());

export const GetMessageSchema = z.object({
  action: z.literal("get"),
  message_id: IdSchema,
});

export const CreateMessageSchema = z.object({
  action: z.literal("create"),
  conversation_id: IdSchema,
  body: z.string().min(1),
  type: z.enum(["email", "sms", "custom"]).optional(),
  options: MessageOptionsSchema.optional(),
}).merge(ConfirmParamSchema);

export const ReplyMessageSchema = z.object({
  action: z.literal("reply"),
  conversation_id: IdSchema,
  body: z.string().min(1),
  options: MessageOptionsSchema.optional(),
}).merge(ConfirmParamSchema);

export const ImportMessageSchema = z.object({
  action: z.literal("import"),
  inbox_id: IdSchema,
  body: z.string().min(1),
  sender: SenderSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
}).merge(ConfirmParamSchema);

export const ReceiveCustomMessageSchema = z.object({
  action: z.literal("receive_custom"),
  channel_id: IdSchema,
  body: z.string().min(1),
  sender: SenderSchema,
}).merge(ConfirmParamSchema);

export const GetSeenStatusSchema = z.object({
  action: z.literal("get_seen_status"),
  message_id: IdSchema,
});

export const MarkSeenSchema = z.object({
  action: z.literal("mark_seen"),
  message_id: IdSchema,
}).merge(ConfirmParamSchema);

export const MessagesInputSchema = z.discriminatedUnion("action", [
  GetMessageSchema,
  CreateMessageSchema,
  ReplyMessageSchema,
  ImportMessageSchema,
  ReceiveCustomMessageSchema,
  GetSeenStatusSchema,
  MarkSeenSchema,
]);

export type MessagesInput = z.infer<typeof MessagesInputSchema>;
export type GetMessageInput = z.infer<typeof GetMessageSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type ReplyMessageInput = z.infer<typeof ReplyMessageSchema>;
export type ImportMessageInput = z.infer<typeof ImportMessageSchema>;
export type ReceiveCustomMessageInput = z.infer<typeof ReceiveCustomMessageSchema>;
export type GetSeenStatusInput = z.infer<typeof GetSeenStatusSchema>;
export type MarkSeenInput = z.infer<typeof MarkSeenSchema>;
