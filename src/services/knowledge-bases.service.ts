import type { FrontClient } from "../client/front-client.js";
import { fetchPage, type PaginatedResponse } from "./pagination.js";
import type {
  KnowledgeBasesListInput,
  KnowledgeBasesGetInput,
  KnowledgeBasesCreateInput,
  KnowledgeBasesUpdateInput,
  KnowledgeBasesListCategoriesInput,
  KnowledgeBasesListArticlesInput,
  KnowledgeBasesGetArticleInput,
  KnowledgeBasesCreateArticleInput,
  KnowledgeBasesUpdateArticleInput,
  KnowledgeBasesDeleteArticleInput,
  KnowledgeBasesGetCategoryInput,
  KnowledgeBasesCreateCategoryInput,
  KnowledgeBasesUpdateCategoryInput,
  KnowledgeBasesDeleteCategoryInput,
} from "../schemas/knowledge-bases.schema.js";

export interface KnowledgeBase {
  id: string;
  name: string;
  locale: string | null;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export interface KnowledgeBaseCategory {
  id: string;
  name: string;
  description: string | null;
  [key: string]: unknown;
}

export interface KnowledgeBaseArticle {
  id: string;
  subject: string;
  content: string;
  status: string;
  [key: string]: unknown;
}

export class KnowledgeBasesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as KnowledgeBasesListInput);
      case "get": return this.get(params as unknown as KnowledgeBasesGetInput);
      case "create": return this.create(params as unknown as KnowledgeBasesCreateInput);
      case "update": return this.update(params as unknown as KnowledgeBasesUpdateInput);
      case "list_categories": return this.listCategories(params as unknown as KnowledgeBasesListCategoriesInput);
      case "list_articles": return this.listArticles(params as unknown as KnowledgeBasesListArticlesInput);
      case "get_article": return this.getArticle(params as unknown as KnowledgeBasesGetArticleInput);
      case "create_article": return this.createArticle(params as unknown as KnowledgeBasesCreateArticleInput);
      case "update_article": return this.updateArticle(params as unknown as KnowledgeBasesUpdateArticleInput);
      case "delete_article": return this.deleteArticle(params as unknown as KnowledgeBasesDeleteArticleInput);
      case "get_category": return this.getCategory(params as unknown as KnowledgeBasesGetCategoryInput);
      case "create_category": return this.createCategory(params as unknown as KnowledgeBasesCreateCategoryInput);
      case "update_category": return this.updateCategory(params as unknown as KnowledgeBasesUpdateCategoryInput);
      case "delete_category": return this.deleteCategory(params as unknown as KnowledgeBasesDeleteCategoryInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: KnowledgeBasesListInput): Promise<PaginatedResponse<KnowledgeBase>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<KnowledgeBase>(this.client, "/knowledge_bases", params);
  }

  async get(input: KnowledgeBasesGetInput): Promise<KnowledgeBase> {
    return this.client.get<KnowledgeBase>(`/knowledge_bases/${input.knowledge_base_id}`);
  }

  async create(input: KnowledgeBasesCreateInput): Promise<KnowledgeBase> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.locale !== undefined) {
      body["locale"] = input.locale;
    }
    return this.client.post<KnowledgeBase>("/knowledge_bases", body);
  }

  async update(input: KnowledgeBasesUpdateInput): Promise<KnowledgeBase> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.locale !== undefined) {
      body["locale"] = input.locale;
    }
    return this.client.patch<KnowledgeBase>(`/knowledge_bases/${input.knowledge_base_id}`, body);
  }

  async listCategories(input: KnowledgeBasesListCategoriesInput): Promise<PaginatedResponse<KnowledgeBaseCategory>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<KnowledgeBaseCategory>(this.client, `/knowledge_bases/${input.knowledge_base_id}/categories`, params);
  }

  async listArticles(input: KnowledgeBasesListArticlesInput): Promise<PaginatedResponse<KnowledgeBaseArticle>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<KnowledgeBaseArticle>(this.client, `/knowledge_bases/${input.knowledge_base_id}/articles`, params);
  }

  async getArticle(input: KnowledgeBasesGetArticleInput): Promise<KnowledgeBaseArticle> {
    return this.client.get<KnowledgeBaseArticle>(`/knowledge_bases/${input.knowledge_base_id}/articles/${input.article_id}`);
  }

  async createArticle(input: KnowledgeBasesCreateArticleInput): Promise<KnowledgeBaseArticle> {
    const body: Record<string, unknown> = {
      subject: input.subject,
      content: input.content,
    };
    if (input.author_id !== undefined) {
      body["author_id"] = input.author_id;
    }
    if (input.category_id !== undefined) {
      body["category_id"] = input.category_id;
    }
    if (input.status !== undefined) {
      body["status"] = input.status;
    }
    if (input.locale !== undefined) {
      body["locale"] = input.locale;
    }
    return this.client.post<KnowledgeBaseArticle>(`/knowledge_bases/${input.knowledge_base_id}/articles`, body);
  }

  async updateArticle(input: KnowledgeBasesUpdateArticleInput): Promise<KnowledgeBaseArticle> {
    const body: Record<string, unknown> = {};
    if (input.subject !== undefined) {
      body["subject"] = input.subject;
    }
    if (input.content !== undefined) {
      body["content"] = input.content;
    }
    if (input.author_id !== undefined) {
      body["author_id"] = input.author_id;
    }
    if (input.category_id !== undefined) {
      body["category_id"] = input.category_id;
    }
    if (input.status !== undefined) {
      body["status"] = input.status;
    }
    if (input.locale !== undefined) {
      body["locale"] = input.locale;
    }
    return this.client.patch<KnowledgeBaseArticle>(`/knowledge_bases/${input.knowledge_base_id}/articles/${input.article_id}`, body);
  }

  async deleteArticle(input: KnowledgeBasesDeleteArticleInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/knowledge_bases/${input.knowledge_base_id}/articles/${input.article_id}`);
  }

  async getCategory(input: KnowledgeBasesGetCategoryInput): Promise<KnowledgeBaseCategory> {
    return this.client.get<KnowledgeBaseCategory>(`/knowledge_bases/${input.knowledge_base_id}/categories/${input.category_id}`);
  }

  async createCategory(input: KnowledgeBasesCreateCategoryInput): Promise<KnowledgeBaseCategory> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.description !== undefined) {
      body["description"] = input.description;
    }
    if (input.parent_category_id !== undefined) {
      body["parent_category_id"] = input.parent_category_id;
    }
    if (input.locale !== undefined) {
      body["locale"] = input.locale;
    }
    return this.client.post<KnowledgeBaseCategory>(`/knowledge_bases/${input.knowledge_base_id}/categories`, body);
  }

  async updateCategory(input: KnowledgeBasesUpdateCategoryInput): Promise<KnowledgeBaseCategory> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.description !== undefined) {
      body["description"] = input.description;
    }
    if (input.locale !== undefined) {
      body["locale"] = input.locale;
    }
    return this.client.patch<KnowledgeBaseCategory>(`/knowledge_bases/${input.knowledge_base_id}/categories/${input.category_id}`, body);
  }

  async deleteCategory(input: KnowledgeBasesDeleteCategoryInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/knowledge_bases/${input.knowledge_base_id}/categories/${input.category_id}`);
  }
}
