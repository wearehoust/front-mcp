import { z } from "zod";

export const PaginationParamsSchema = z.object({
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  auto_paginate: z.boolean().optional(),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const ConfirmParamSchema = z.object({
  confirm: z.boolean().optional(),
});

export const IdSchema = z.string().min(1);
