import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  ContactNotesListInput,
  ContactNotesCreateInput,
} from "../schemas/contact_notes.schema.js";

export interface ContactNote {
  id: string;
  author: {
    id: string;
    [key: string]: unknown;
  };
  body: string;
  created_at: number;
}

export class ContactNotesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as ContactNotesListInput);
      case "create": return this.create(params as unknown as ContactNotesCreateInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: ContactNotesListInput): Promise<PaginatedResponse<ContactNote>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<ContactNote>(this.client, `/contacts/${input.contact_id}/notes`, params);
    }
    return fetchPage<ContactNote>(this.client, `/contacts/${input.contact_id}/notes`, params);
  }

  async create(input: ContactNotesCreateInput): Promise<ContactNote> {
    return this.client.post<ContactNote>(`/contacts/${input.contact_id}/notes`, {
      author_id: input.author_id,
      body: input.body,
    });
  }
}
