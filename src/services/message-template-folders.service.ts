import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  MessageTemplateFoldersListInput,
  MessageTemplateFoldersGetInput,
  MessageTemplateFoldersCreateInput,
  MessageTemplateFoldersUpdateInput,
  MessageTemplateFoldersDeleteInput,
  MessageTemplateFoldersListChildrenInput,
  MessageTemplateFoldersCreateChildInput,
} from "../schemas/message-template-folders.schema.js";

export interface MessageTemplateFolder {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export class MessageTemplateFoldersService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as MessageTemplateFoldersListInput);
      case "get": return this.get(params as unknown as MessageTemplateFoldersGetInput);
      case "create": return this.create(params as unknown as MessageTemplateFoldersCreateInput);
      case "update": return this.update(params as unknown as MessageTemplateFoldersUpdateInput);
      case "delete": return this.delete(params as unknown as MessageTemplateFoldersDeleteInput);
      case "list_children": return this.listChildren(params as unknown as MessageTemplateFoldersListChildrenInput);
      case "create_child": return this.createChild(params as unknown as MessageTemplateFoldersCreateChildInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: MessageTemplateFoldersListInput): Promise<PaginatedResponse<MessageTemplateFolder>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<MessageTemplateFolder>(this.client, "/message_template_folders", params);
    }
    return fetchPage<MessageTemplateFolder>(this.client, "/message_template_folders", params);
  }

  async get(input: MessageTemplateFoldersGetInput): Promise<MessageTemplateFolder> {
    return this.client.get<MessageTemplateFolder>(`/message_template_folders/${input.folder_id}`);
  }

  async create(input: MessageTemplateFoldersCreateInput): Promise<MessageTemplateFolder> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.parent_folder_id !== undefined) {
      body["parent_folder_id"] = input.parent_folder_id;
    }
    return this.client.post<MessageTemplateFolder>("/message_template_folders", body);
  }

  async update(input: MessageTemplateFoldersUpdateInput): Promise<MessageTemplateFolder> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.parent_folder_id !== undefined) {
      body["parent_folder_id"] = input.parent_folder_id;
    }
    return this.client.patch<MessageTemplateFolder>(`/message_template_folders/${input.folder_id}`, body);
  }

  async delete(input: MessageTemplateFoldersDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/message_template_folders/${input.folder_id}`);
  }

  async listChildren(input: MessageTemplateFoldersListChildrenInput): Promise<PaginatedResponse<MessageTemplateFolder>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<MessageTemplateFolder>(this.client, `/message_template_folders/${input.folder_id}/message_template_folders`, params);
  }

  async createChild(input: MessageTemplateFoldersCreateChildInput): Promise<MessageTemplateFolder> {
    const body: Record<string, unknown> = { name: input.name };
    return this.client.post<MessageTemplateFolder>(`/message_template_folders/${input.folder_id}/message_template_folders`, body);
  }
}
