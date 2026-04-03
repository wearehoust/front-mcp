import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  MessageTemplatesListInput,
  MessageTemplatesGetInput,
  MessageTemplatesCreateInput,
  MessageTemplatesUpdateInput,
  MessageTemplatesDeleteInput,
} from "../schemas/message-templates.schema.js";

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export class MessageTemplatesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as MessageTemplatesListInput);
      case "get": return this.get(params as unknown as MessageTemplatesGetInput);
      case "create": return this.create(params as unknown as MessageTemplatesCreateInput);
      case "update": return this.update(params as unknown as MessageTemplatesUpdateInput);
      case "delete": return this.delete(params as unknown as MessageTemplatesDeleteInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: MessageTemplatesListInput): Promise<PaginatedResponse<MessageTemplate>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<MessageTemplate>(this.client, "/message_templates", params);
    }
    return fetchPage<MessageTemplate>(this.client, "/message_templates", params);
  }

  async get(input: MessageTemplatesGetInput): Promise<MessageTemplate> {
    return this.client.get<MessageTemplate>(`/message_templates/${input.template_id}`);
  }

  async create(input: MessageTemplatesCreateInput): Promise<MessageTemplate> {
    const body: Record<string, unknown> = {
      name: input.name,
      body: input.body,
    };
    if (input.subject !== undefined) {
      body["subject"] = input.subject;
    }
    if (input.folder_id !== undefined) {
      body["folder_id"] = input.folder_id;
    }
    if (input.inbox_ids !== undefined) {
      body["inbox_ids"] = input.inbox_ids;
    }
    if (input.attachments !== undefined) {
      body["attachments"] = input.attachments;
    }
    return this.client.post<MessageTemplate>("/message_templates", body);
  }

  async update(input: MessageTemplatesUpdateInput): Promise<MessageTemplate> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.subject !== undefined) {
      body["subject"] = input.subject;
    }
    if (input.body !== undefined) {
      body["body"] = input.body;
    }
    if (input.folder_id !== undefined) {
      body["folder_id"] = input.folder_id;
    }
    if (input.inbox_ids !== undefined) {
      body["inbox_ids"] = input.inbox_ids;
    }
    if (input.attachments !== undefined) {
      body["attachments"] = input.attachments;
    }
    return this.client.patch<MessageTemplate>(`/message_templates/${input.template_id}`, body);
  }

  async delete(input: MessageTemplatesDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/message_templates/${input.template_id}`);
  }

}
