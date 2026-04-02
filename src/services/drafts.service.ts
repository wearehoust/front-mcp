import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  DraftsListInput,
  DraftsCreateInput,
  DraftsCreateReplyInput,
  DraftsUpdateInput,
  DraftsDeleteInput,
} from "../schemas/drafts.schema.js";

export interface Draft {
  id: string;
  author: {
    id: string;
    [key: string]: unknown;
  };
  body: string;
  subject?: string;
  mode: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export class DraftsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as DraftsListInput);
      case "create": return this.create(params as unknown as DraftsCreateInput);
      case "create_reply": return this.createReply(params as unknown as DraftsCreateReplyInput);
      case "update": return this.update(params as unknown as DraftsUpdateInput);
      case "delete": return this.delete(params as unknown as DraftsDeleteInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: DraftsListInput): Promise<PaginatedResponse<Draft>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Draft>(this.client, `/conversations/${input.conversation_id}/drafts`, params);
    }
    return fetchPage<Draft>(this.client, `/conversations/${input.conversation_id}/drafts`, params);
  }

  async create(input: DraftsCreateInput): Promise<Draft> {
    const body: Record<string, unknown> = {
      author_id: input.author_id,
      body: input.body,
    };
    if (input.subject !== undefined) body["subject"] = input.subject;
    if (input.to !== undefined) body["to"] = input.to;
    if (input.cc !== undefined) body["cc"] = input.cc;
    if (input.bcc !== undefined) body["bcc"] = input.bcc;
    if (input.channel_id !== undefined) body["channel_id"] = input.channel_id;
    if (input.mode !== undefined) body["mode"] = input.mode;

    return this.client.post<Draft>(`/conversations/${input.conversation_id}/drafts`, body);
  }

  async createReply(input: DraftsCreateReplyInput): Promise<Draft> {
    const body: Record<string, unknown> = {
      author_id: input.author_id,
      body: input.body,
    };
    if (input.channel_id !== undefined) body["channel_id"] = input.channel_id;
    if (input.to !== undefined) body["to"] = input.to;
    if (input.cc !== undefined) body["cc"] = input.cc;
    if (input.bcc !== undefined) body["bcc"] = input.bcc;
    if (input.mode !== undefined) body["mode"] = input.mode;

    return this.client.post<Draft>(`/conversations/${input.conversation_id}/drafts`, body);
  }

  async update(input: DraftsUpdateInput): Promise<Draft> {
    const body: Record<string, unknown> = {
      author_id: input.author_id,
    };
    if (input.body !== undefined) body["body"] = input.body;
    if (input.subject !== undefined) body["subject"] = input.subject;
    if (input.to !== undefined) body["to"] = input.to;
    if (input.cc !== undefined) body["cc"] = input.cc;
    if (input.bcc !== undefined) body["bcc"] = input.bcc;
    if (input.mode !== undefined) body["mode"] = input.mode;

    return this.client.patch<Draft>(`/drafts/${input.draft_id}`, body);
  }

  async delete(input: DraftsDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/drafts/${input.draft_id}`);
  }
}
