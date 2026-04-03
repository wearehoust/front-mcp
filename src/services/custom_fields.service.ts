import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  CustomFieldsListForAccountsInput,
  CustomFieldsListForContactsInput,
  CustomFieldsListForConversationsInput,
  CustomFieldsListForInboxesInput,
  CustomFieldsListForLinksInput,
  CustomFieldsListForTeammatesInput,
} from "../schemas/custom_fields.schema.js";

export interface CustomField {
  id: string;
  name: string;
  type: string;
  description?: string;
  [key: string]: unknown;
}

export class CustomFieldsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list_for_accounts": return this.listForAccounts(params as unknown as CustomFieldsListForAccountsInput);
      case "list_for_contacts": return this.listForContacts(params as unknown as CustomFieldsListForContactsInput);
      case "list_for_conversations": return this.listForConversations(params as unknown as CustomFieldsListForConversationsInput);
      case "list_for_inboxes": return this.listForInboxes(params as unknown as CustomFieldsListForInboxesInput);
      case "list_for_links": return this.listForLinks(params as unknown as CustomFieldsListForLinksInput);
      case "list_for_teammates": return this.listForTeammates(params as unknown as CustomFieldsListForTeammatesInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  private buildPageParams(input: {
    page_token?: string;
    limit?: number;
  }): Record<string, string> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return params;
  }

  async listForAccounts(input: CustomFieldsListForAccountsInput): Promise<PaginatedResponse<CustomField>> {
    const params = this.buildPageParams(input);
    if (input.auto_paginate === true) {
      return autoPaginate<CustomField>(this.client, "/accounts/custom_fields", params);
    }
    return fetchPage<CustomField>(this.client, "/accounts/custom_fields", params);
  }

  async listForContacts(input: CustomFieldsListForContactsInput): Promise<PaginatedResponse<CustomField>> {
    const params = this.buildPageParams(input);
    if (input.auto_paginate === true) {
      return autoPaginate<CustomField>(this.client, "/contacts/custom_fields", params);
    }
    return fetchPage<CustomField>(this.client, "/contacts/custom_fields", params);
  }

  async listForConversations(input: CustomFieldsListForConversationsInput): Promise<PaginatedResponse<CustomField>> {
    const params = this.buildPageParams(input);
    if (input.auto_paginate === true) {
      return autoPaginate<CustomField>(this.client, "/conversations/custom_fields", params);
    }
    return fetchPage<CustomField>(this.client, "/conversations/custom_fields", params);
  }

  async listForInboxes(input: CustomFieldsListForInboxesInput): Promise<PaginatedResponse<CustomField>> {
    const params = this.buildPageParams(input);
    if (input.auto_paginate === true) {
      return autoPaginate<CustomField>(this.client, "/inboxes/custom_fields", params);
    }
    return fetchPage<CustomField>(this.client, "/inboxes/custom_fields", params);
  }

  async listForLinks(input: CustomFieldsListForLinksInput): Promise<PaginatedResponse<CustomField>> {
    const params = this.buildPageParams(input);
    if (input.auto_paginate === true) {
      return autoPaginate<CustomField>(this.client, "/links/custom_fields", params);
    }
    return fetchPage<CustomField>(this.client, "/links/custom_fields", params);
  }

  async listForTeammates(input: CustomFieldsListForTeammatesInput): Promise<PaginatedResponse<CustomField>> {
    const params = this.buildPageParams(input);
    if (input.auto_paginate === true) {
      return autoPaginate<CustomField>(this.client, "/teammates/custom_fields", params);
    }
    return fetchPage<CustomField>(this.client, "/teammates/custom_fields", params);
  }
}
