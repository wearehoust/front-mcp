import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  AccountsListInput,
  AccountsGetInput,
  AccountsCreateInput,
  AccountsUpdateInput,
  AccountsDeleteInput,
  AccountsListContactsInput,
  AccountsAddContactInput,
  AccountsRemoveContactInput,
} from "../schemas/accounts.schema.js";

export interface Account {
  id: string;
  name: string;
  description?: string;
  domains: string[];
  external_id?: string;
  custom_fields?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export interface AccountContact {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export class AccountsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as AccountsListInput);
      case "get": return this.get(params as unknown as AccountsGetInput);
      case "create": return this.create(params as unknown as AccountsCreateInput);
      case "update": return this.update(params as unknown as AccountsUpdateInput);
      case "delete": return this.delete(params as unknown as AccountsDeleteInput);
      case "list_contacts": return this.listContacts(params as unknown as AccountsListContactsInput);
      case "add_contact": return this.addContact(params as unknown as AccountsAddContactInput);
      case "remove_contact": return this.removeContact(params as unknown as AccountsRemoveContactInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: AccountsListInput): Promise<PaginatedResponse<Account>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Account>(this.client, "/accounts", params);
    }
    return fetchPage<Account>(this.client, "/accounts", params);
  }

  async get(input: AccountsGetInput): Promise<Account> {
    return this.client.get<Account>(`/accounts/${input.account_id}`);
  }

  async create(input: AccountsCreateInput): Promise<Account> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.description !== undefined) {
      body["description"] = input.description;
    }
    if (input.domains !== undefined) {
      body["domains"] = input.domains;
    }
    if (input.external_id !== undefined) {
      body["external_id"] = input.external_id;
    }
    if (input.custom_fields !== undefined) {
      body["custom_fields"] = input.custom_fields;
    }
    return this.client.post<Account>("/accounts", body);
  }

  async update(input: AccountsUpdateInput): Promise<Account> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.description !== undefined) {
      body["description"] = input.description;
    }
    if (input.domains !== undefined) {
      body["domains"] = input.domains;
    }
    if (input.external_id !== undefined) {
      body["external_id"] = input.external_id;
    }
    if (input.custom_fields !== undefined) {
      body["custom_fields"] = input.custom_fields;
    }
    return this.client.patch<Account>(`/accounts/${input.account_id}`, body);
  }

  async delete(input: AccountsDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/accounts/${input.account_id}`);
  }

  async listContacts(input: AccountsListContactsInput): Promise<PaginatedResponse<AccountContact>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<AccountContact>(this.client, `/accounts/${input.account_id}/contacts`, params);
  }

  async addContact(input: AccountsAddContactInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/accounts/${input.account_id}/contacts`,
      { contact_id: input.contact_id },
    );
  }

  async removeContact(input: AccountsRemoveContactInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/accounts/${input.account_id}/contacts`,
      { contact_ids: [input.contact_id] },
    );
  }
}
