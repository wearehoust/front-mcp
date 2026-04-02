import { z } from "zod";

export const TokenIdentityGetSchema = z.object({
  action: z.literal("get"),
});

export const TokenIdentityInputSchema = z.discriminatedUnion("action", [
  TokenIdentityGetSchema,
]);

export type TokenIdentityParams = z.infer<typeof TokenIdentityInputSchema>;
