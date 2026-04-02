import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  TeammatesListInput,
  TeammatesGetInput,
  TeammatesUpdateInput,
  TeammatesListConversationsInput,
  TeammatesListInboxesInput,
} from "../schemas/teammates.schema.js";

export interface Teammate {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_available: boolean;
  custom_fields: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  [key: string]: unknown;
}

export interface Inbox {
  id: string;
  name: string;
  [key: string]: unknown;
}

export class TeammatesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as TeammatesListInput);
      case "get": return this.get(params as unknown as TeammatesGetInput);
      case "update": return this.update(params as unknown as TeammatesUpdateInput);
      case "list_conversations": return this.listConversations(params as unknown as TeammatesListConversationsInput);
      case "list_inboxes": return this.listInboxes(params as unknown as TeammatesListInboxesInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: TeammatesListInput): Promise<PaginatedResponse<Teammate>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Teammate>(this.client, "/teammates", params);
    }
    return fetchPage<Teammate>(this.client, "/teammates", params);
  }

  async get(input: TeammatesGetInput): Promise<Teammate> {
    return this.client.get<Teammate>(`/teammates/${input.teammate_id}`);
  }

  async update(input: TeammatesUpdateInput): Promise<Teammate> {
    const body: Record<string, unknown> = {};
    if (input.username !== undefined) {
      body["username"] = input.username;
    }
    if (input.first_name !== undefined) {
      body["first_name"] = input.first_name;
    }
    if (input.last_name !== undefined) {
      body["last_name"] = input.last_name;
    }
    if (input.is_available !== undefined) {
      body["is_available"] = input.is_available;
    }
    if (input.custom_fields !== undefined) {
      body["custom_fields"] = input.custom_fields;
    }
    return this.client.patch<Teammate>(`/teammates/${input.teammate_id}`, body);
  }

  async listConversations(input: TeammatesListConversationsInput): Promise<PaginatedResponse<Conversation>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Conversation>(
        this.client,
        `/teammates/${input.teammate_id}/conversations`,
        params,
      );
    }
    return fetchPage<Conversation>(
      this.client,
      `/teammates/${input.teammate_id}/conversations`,
      params,
    );
  }

  async listInboxes(input: TeammatesListInboxesInput): Promise<PaginatedResponse<Inbox>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Inbox>(this.client, `/teammates/${input.teammate_id}/inboxes`, params);
  }
}
