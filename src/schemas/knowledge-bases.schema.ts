import { z } from "zod";
import { PaginationParamsSchema, ConfirmParamSchema, IdSchema } from "./common.schema.js";

export const KnowledgeBasesListSchema = PaginationParamsSchema.extend({
  action: z.literal("list"),
});

export const KnowledgeBasesGetSchema = z.object({
  action: z.literal("get"),
  knowledge_base_id: IdSchema,
});

export const KnowledgeBasesCreateSchema = ConfirmParamSchema.extend({
  action: z.literal("create"),
  name: z.string().min(1),
  locale: z.string().optional(),
});

export const KnowledgeBasesUpdateSchema = ConfirmParamSchema.extend({
  action: z.literal("update"),
  knowledge_base_id: IdSchema,
  name: z.string().min(1).optional(),
  locale: z.string().optional(),
});

export const KnowledgeBasesListCategoriesSchema = z.object({
  action: z.literal("list_categories"),
  knowledge_base_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const KnowledgeBasesListArticlesSchema = z.object({
  action: z.literal("list_articles"),
  knowledge_base_id: IdSchema,
  page_token: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const KnowledgeBasesGetArticleSchema = z.object({
  action: z.literal("get_article"),
  knowledge_base_id: IdSchema.optional(),
  article_id: IdSchema,
});

export const KnowledgeBasesCreateArticleSchema = ConfirmParamSchema.extend({
  action: z.literal("create_article"),
  knowledge_base_id: IdSchema,
  subject: z.string().min(1),
  content: z.string().min(1),
  author_id: z.string().optional(),
  category_id: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  locale: z.string().optional(),
});

export const KnowledgeBasesUpdateArticleSchema = ConfirmParamSchema.extend({
  action: z.literal("update_article"),
  knowledge_base_id: IdSchema.optional(),
  article_id: IdSchema,
  subject: z.string().optional(),
  content: z.string().optional(),
  author_id: z.string().optional(),
  category_id: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  locale: z.string().optional(),
});

export const KnowledgeBasesDeleteArticleSchema = ConfirmParamSchema.extend({
  action: z.literal("delete_article"),
  knowledge_base_id: IdSchema.optional(),
  article_id: IdSchema,
});

export const KnowledgeBasesGetCategorySchema = z.object({
  action: z.literal("get_category"),
  knowledge_base_id: IdSchema.optional(),
  category_id: IdSchema,
});

export const KnowledgeBasesCreateCategorySchema = ConfirmParamSchema.extend({
  action: z.literal("create_category"),
  knowledge_base_id: IdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  parent_category_id: z.string().optional(),
  locale: z.string().optional(),
});

export const KnowledgeBasesUpdateCategorySchema = ConfirmParamSchema.extend({
  action: z.literal("update_category"),
  knowledge_base_id: IdSchema.optional(),
  category_id: IdSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  locale: z.string().optional(),
});

export const KnowledgeBasesDeleteCategorySchema = ConfirmParamSchema.extend({
  action: z.literal("delete_category"),
  knowledge_base_id: IdSchema.optional(),
  category_id: IdSchema,
});

export const KnowledgeBasesSchema = z.discriminatedUnion("action", [
  KnowledgeBasesListSchema,
  KnowledgeBasesGetSchema,
  KnowledgeBasesCreateSchema,
  KnowledgeBasesUpdateSchema,
  KnowledgeBasesListCategoriesSchema,
  KnowledgeBasesListArticlesSchema,
  KnowledgeBasesGetArticleSchema,
  KnowledgeBasesCreateArticleSchema,
  KnowledgeBasesUpdateArticleSchema,
  KnowledgeBasesDeleteArticleSchema,
  KnowledgeBasesGetCategorySchema,
  KnowledgeBasesCreateCategorySchema,
  KnowledgeBasesUpdateCategorySchema,
  KnowledgeBasesDeleteCategorySchema,
]);

export type KnowledgeBasesInput = z.infer<typeof KnowledgeBasesSchema>;
export type KnowledgeBasesListInput = z.infer<typeof KnowledgeBasesListSchema>;
export type KnowledgeBasesGetInput = z.infer<typeof KnowledgeBasesGetSchema>;
export type KnowledgeBasesCreateInput = z.infer<typeof KnowledgeBasesCreateSchema>;
export type KnowledgeBasesUpdateInput = z.infer<typeof KnowledgeBasesUpdateSchema>;
export type KnowledgeBasesListCategoriesInput = z.infer<typeof KnowledgeBasesListCategoriesSchema>;
export type KnowledgeBasesListArticlesInput = z.infer<typeof KnowledgeBasesListArticlesSchema>;
export type KnowledgeBasesGetArticleInput = z.infer<typeof KnowledgeBasesGetArticleSchema>;
export type KnowledgeBasesCreateArticleInput = z.infer<typeof KnowledgeBasesCreateArticleSchema>;
export type KnowledgeBasesUpdateArticleInput = z.infer<typeof KnowledgeBasesUpdateArticleSchema>;
export type KnowledgeBasesDeleteArticleInput = z.infer<typeof KnowledgeBasesDeleteArticleSchema>;
export type KnowledgeBasesGetCategoryInput = z.infer<typeof KnowledgeBasesGetCategorySchema>;
export type KnowledgeBasesCreateCategoryInput = z.infer<typeof KnowledgeBasesCreateCategorySchema>;
export type KnowledgeBasesUpdateCategoryInput = z.infer<typeof KnowledgeBasesUpdateCategorySchema>;
export type KnowledgeBasesDeleteCategoryInput = z.infer<typeof KnowledgeBasesDeleteCategorySchema>;
