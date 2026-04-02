import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const ContactNotesListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
  contact_id: IdSchema,
});

export const ContactNotesCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  contact_id: IdSchema,
  author_id: z.string().min(1),
  body: z.string().min(1),
});

export const ContactNotesSchema = z.discriminatedUnion("action", [
  ContactNotesListSchema,
  ContactNotesCreateSchema,
]);

export type ContactNotesInput = z.infer<typeof ContactNotesSchema>;
export type ContactNotesListInput = z.infer<typeof ContactNotesListSchema>;
export type ContactNotesCreateInput = z.infer<typeof ContactNotesCreateSchema>;
