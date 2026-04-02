import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  InboxesListInput,
  InboxesGetInput,
  InboxesCreateInput,
  InboxesListChannelsInput,
  InboxesListConversationsInput,
  InboxesListAccessInput,
  InboxesGrantAccessInput,
  InboxesRevokeAccessInput,
} from "../schemas/inboxes.schema.js";

export interface Inbox {
  id: string;
  name: string;
  address: string | null;
  send_as: string | null;
  custom_fields: Record<string, unknown>;
  is_private: boolean;
  [key: string]: unknown;
}

export interface Channel {
  id: string;
  name: string | null;
  address: string;
  type: string;
  send_as: string | null;
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  [key: string]: unknown;
}

export interface Teammate {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
}

export class InboxesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async list(input: InboxesListInput): Promise<PaginatedResponse<Inbox>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Inbox>(this.client, "/inboxes", params);
    }
    return fetchPage<Inbox>(this.client, "/inboxes", params);
  }

  async get(input: InboxesGetInput): Promise<Inbox> {
    return this.client.get<Inbox>(`/inboxes/${input.inbox_id}`);
  }

  async create(input: InboxesCreateInput): Promise<Inbox> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.teammate_ids !== undefined) {
      body["teammate_ids"] = input.teammate_ids;
    }
    return this.client.post<Inbox>("/inboxes", body);
  }

  async listChannels(input: InboxesListChannelsInput): Promise<PaginatedResponse<Channel>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Channel>(this.client, `/inboxes/${input.inbox_id}/channels`, params);
  }

  async listConversations(input: InboxesListConversationsInput): Promise<PaginatedResponse<Conversation>> {
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
        `/inboxes/${input.inbox_id}/conversations`,
        params,
      );
    }
    return fetchPage<Conversation>(
      this.client,
      `/inboxes/${input.inbox_id}/conversations`,
      params,
    );
  }

  async listAccess(input: InboxesListAccessInput): Promise<PaginatedResponse<Teammate>> {
    return fetchPage<Teammate>(this.client, `/inboxes/${input.inbox_id}/teammates`);
  }

  async grantAccess(input: InboxesGrantAccessInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/inboxes/${input.inbox_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }

  async revokeAccess(input: InboxesRevokeAccessInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/inboxes/${input.inbox_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }
}
