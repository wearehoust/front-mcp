import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  ContactGroupsListInput,
  ContactGroupsCreateInput,
  ContactGroupsDeleteInput,
  ContactGroupsListContactsInput,
  ContactGroupsAddContactsInput,
  ContactGroupsRemoveContactsInput,
} from "../schemas/contact_groups.schema.js";

export interface ContactGroup {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export interface ContactGroupContact {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export class ContactGroupsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as ContactGroupsListInput);
      case "create": return this.create(params as unknown as ContactGroupsCreateInput);
      case "delete": return this.delete(params as unknown as ContactGroupsDeleteInput);
      case "list_contacts": return this.listContacts(params as unknown as ContactGroupsListContactsInput);
      case "add_contacts": return this.addContacts(params as unknown as ContactGroupsAddContactsInput);
      case "remove_contacts": return this.removeContacts(params as unknown as ContactGroupsRemoveContactsInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: ContactGroupsListInput): Promise<PaginatedResponse<ContactGroup>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<ContactGroup>(this.client, "/contact_groups", params);
    }
    return fetchPage<ContactGroup>(this.client, "/contact_groups", params);
  }

  async create(input: ContactGroupsCreateInput): Promise<ContactGroup> {
    return this.client.post<ContactGroup>("/contact_groups", { name: input.name });
  }

  async delete(input: ContactGroupsDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/contact_groups/${input.contact_group_id}`,
    );
  }

  async listContacts(input: ContactGroupsListContactsInput): Promise<PaginatedResponse<ContactGroupContact>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<ContactGroupContact>(
      this.client,
      `/contact_groups/${input.contact_group_id}/contacts`,
      params,
    );
  }

  async addContacts(input: ContactGroupsAddContactsInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/contact_groups/${input.contact_group_id}/contacts`,
      { contact_ids: input.contact_ids },
    );
  }

  async removeContacts(input: ContactGroupsRemoveContactsInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/contact_groups/${input.contact_group_id}/contacts`,
      { contact_ids: input.contact_ids },
    );
  }
}
