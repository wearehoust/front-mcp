import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  TagsListInput,
  TagsGetInput,
  TagsCreateInput,
  TagsUpdateInput,
  TagsDeleteInput,
  TagsListChildrenInput,
  TagsCreateChildInput,
  TagsListConversationsInput,
} from "../schemas/tags.schema.js";

export interface Tag {
  id: string;
  name: string;
  highlight: string | null;
  is_visible_in_conversation_lists: boolean;
  created_at: number;
  updated_at: number;
}

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  [key: string]: unknown;
}

export class TagsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as TagsListInput);
      case "get": return this.get(params as unknown as TagsGetInput);
      case "create": return this.create(params as unknown as TagsCreateInput);
      case "update": return this.update(params as unknown as TagsUpdateInput);
      case "delete": return this.delete(params as unknown as TagsDeleteInput);
      case "list_children": return this.listChildren(params as unknown as TagsListChildrenInput);
      case "create_child": return this.createChild(params as unknown as TagsCreateChildInput);
      case "list_conversations": return this.listConversations(params as unknown as TagsListConversationsInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: TagsListInput): Promise<PaginatedResponse<Tag>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Tag>(this.client, "/tags", params);
    }
    return fetchPage<Tag>(this.client, "/tags", params);
  }

  async get(input: TagsGetInput): Promise<Tag> {
    return this.client.get<Tag>(`/tags/${input.tag_id}`);
  }

  async create(input: TagsCreateInput): Promise<Tag> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.highlight !== undefined) {
      body["highlight"] = input.highlight;
    }
    if (input.is_visible_in_conversation_lists !== undefined) {
      body["is_visible_in_conversation_lists"] = input.is_visible_in_conversation_lists;
    }
    return this.client.post<Tag>("/tags", body);
  }

  async update(input: TagsUpdateInput): Promise<Tag> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.highlight !== undefined) {
      body["highlight"] = input.highlight;
    }
    if (input.is_visible_in_conversation_lists !== undefined) {
      body["is_visible_in_conversation_lists"] = input.is_visible_in_conversation_lists;
    }
    return this.client.patch<Tag>(`/tags/${input.tag_id}`, body);
  }

  async delete(input: TagsDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/tags/${input.tag_id}`);
  }

  async listChildren(input: TagsListChildrenInput): Promise<PaginatedResponse<Tag>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Tag>(this.client, `/tags/${input.tag_id}/children`, params);
  }

  async createChild(input: TagsCreateChildInput): Promise<Tag> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.highlight !== undefined) {
      body["highlight"] = input.highlight;
    }
    return this.client.post<Tag>(`/tags/${input.tag_id}/children`, body);
  }

  async listConversations(input: TagsListConversationsInput): Promise<PaginatedResponse<Conversation>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Conversation>(this.client, `/tags/${input.tag_id}/conversations`, params);
  }
}
