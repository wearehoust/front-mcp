import type { FrontClient } from "../client/front-client.js";
import {
  fetchPage,
  autoPaginate,
  type PaginatedResponse,
} from "./pagination.js";

export interface ContactHandle {
  id: string;
  source: string;
  handle: string;
}

export interface Contact {
  id: string;
  name?: string;
  description?: string;
  handles: ContactHandle[];
  [key: string]: unknown;
}

export interface ContactCreateBody {
  handles: Array<{ source: string; handle: string }>;
  name?: string;
  description?: string;
}

export interface ContactUpdateBody {
  name?: string;
  description?: string;
}

export interface ContactMergeBody {
  target_contact_id: string;
  source_contact_id: string;
}

export interface AddHandleBody {
  source: string;
  handle: string;
}

export class ContactsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async list(params: {
    page_token?: string;
    limit?: number;
    auto_paginate?: boolean;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<PaginatedResponse<Contact>> {
    const queryParams: Record<string, string> = {};

    if (params.page_token !== undefined) {
      queryParams["page_token"] = params.page_token;
    }
    if (params.limit !== undefined) {
      queryParams["limit"] = String(params.limit);
    }
    if (params.sort_by !== undefined) {
      queryParams["sort_by"] = params.sort_by;
    }
    if (params.sort_order !== undefined) {
      queryParams["sort_order"] = params.sort_order;
    }

    if (params.auto_paginate === true) {
      return autoPaginate<Contact>(this.client, "/contacts", queryParams);
    }

    return fetchPage<Contact>(this.client, "/contacts", queryParams);
  }

  async get(contactId: string): Promise<Contact> {
    return this.client.get<Contact>(`/contacts/${contactId}`);
  }

  async create(body: ContactCreateBody): Promise<Contact> {
    return this.client.post<Contact>("/contacts", body);
  }

  async update(contactId: string, body: ContactUpdateBody): Promise<Contact> {
    return this.client.patch<Contact>(`/contacts/${contactId}`, body);
  }

  async delete(contactId: string): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/contacts/${contactId}`);
  }

  async merge(body: ContactMergeBody): Promise<Contact> {
    return this.client.post<Contact>("/contacts/merge", body);
  }

  async listConversations(
    contactId: string,
    params: { page_token?: string; limit?: number },
  ): Promise<PaginatedResponse<unknown>> {
    const queryParams: Record<string, string> = {};

    if (params.page_token !== undefined) {
      queryParams["page_token"] = params.page_token;
    }
    if (params.limit !== undefined) {
      queryParams["limit"] = String(params.limit);
    }

    return fetchPage<unknown>(
      this.client,
      `/contacts/${contactId}/conversations`,
      queryParams,
    );
  }

  async addHandle(contactId: string, body: AddHandleBody): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/contacts/${contactId}/handles`,
      body,
    );
  }

  async removeHandle(
    contactId: string,
    handleId: string,
  ): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/contacts/${contactId}/handles/${handleId}`,
    );
  }
}
