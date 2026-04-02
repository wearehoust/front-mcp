import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  ContactListsListInput,
  ContactListsCreateInput,
  ContactListsDeleteInput,
  ContactListsListContactsInput,
  ContactListsAddContactsInput,
  ContactListsRemoveContactsInput,
} from "../schemas/contact_lists.schema.js";

export interface ContactList {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface Contact {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export class ContactListsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as ContactListsListInput);
      case "create": return this.create(params as unknown as ContactListsCreateInput);
      case "delete": return this.delete(params as unknown as ContactListsDeleteInput);
      case "list_contacts": return this.listContacts(params as unknown as ContactListsListContactsInput);
      case "add_contacts": return this.addContacts(params as unknown as ContactListsAddContactsInput);
      case "remove_contacts": return this.removeContacts(params as unknown as ContactListsRemoveContactsInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: ContactListsListInput): Promise<PaginatedResponse<ContactList>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<ContactList>(this.client, "/contact_lists", params);
    }
    return fetchPage<ContactList>(this.client, "/contact_lists", params);
  }

  async create(input: ContactListsCreateInput): Promise<ContactList> {
    return this.client.post<ContactList>("/contact_lists", { name: input.name });
  }

  async delete(input: ContactListsDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/contact_lists/${input.contact_list_id}`);
  }

  async listContacts(input: ContactListsListContactsInput): Promise<PaginatedResponse<Contact>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Contact>(this.client, `/contact_lists/${input.contact_list_id}/contacts`, params);
  }

  async addContacts(input: ContactListsAddContactsInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/contact_lists/${input.contact_list_id}/contacts`,
      { contact_ids: input.contact_ids },
    );
  }

  async removeContacts(input: ContactListsRemoveContactsInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/contact_lists/${input.contact_list_id}/contacts`,
      { contact_ids: input.contact_ids },
    );
  }
}
