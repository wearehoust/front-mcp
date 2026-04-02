import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type { ConversationsParams } from "../schemas/conversations.schema.js";

// ---------------------------------------------------------------------------
// Minimal response-shape types (kept narrow — strict mode, no `any`)
// ---------------------------------------------------------------------------

export interface ConversationRecord {
  id: string;
  [key: string]: unknown;
}

export interface EventRecord {
  id: string;
  [key: string]: unknown;
}

export interface TeammateRecord {
  id: string;
  [key: string]: unknown;
}

export interface InboxRecord {
  id: string;
  [key: string]: unknown;
}

export interface MessageRecord {
  id: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// ConversationsService
// ---------------------------------------------------------------------------

export class ConversationsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: ConversationsParams | Record<string, unknown>): Promise<unknown> {
    // Allow Record<string, unknown> from tool layer — the switch narrows via action
    const p = params as ConversationsParams;
    return this.dispatch(p);
  }

  private async dispatch(params: ConversationsParams): Promise<unknown> {
    switch (params.action) {
      case "list":
        return this.list(params);
      case "get":
        return this.get(params);
      case "search":
        return this.search(params);
      case "create":
        return this.create(params);
      case "update":
        return this.update(params);
      case "delete":
        return this.delete(params);
      case "assign":
        return this.assign(params);
      case "list_events":
        return this.listEvents(params);
      case "list_followers":
        return this.listFollowers(params);
      case "add_followers":
        return this.addFollowers(params);
      case "remove_followers":
        return this.removeFollowers(params);
      case "list_inboxes":
        return this.listInboxes(params);
      case "add_link":
        return this.addLink(params);
      case "remove_links":
        return this.removeLinks(params);
      case "list_messages":
        return this.listMessages(params);
      case "update_reminders":
        return this.updateReminders(params);
      case "add_tag":
        return this.addTag(params);
      case "remove_tag":
        return this.removeTag(params);
    }
  }

  // ---------------------------------------------------------------------------
  // Read actions
  // ---------------------------------------------------------------------------

  async list(params: Extract<ConversationsParams, { action: "list" }>): Promise<PaginatedResponse<ConversationRecord>> {
    const queryParams: Record<string, string> = {};

    if (params.statuses !== undefined && params.statuses.length > 0) {
      // Front API accepts repeated query params — we join with comma for simplicity;
      // callers relying on exact multi-value format should pass a single status.
      queryParams["q[statuses][]"] = params.statuses.join(",");
    }

    if (params.limit !== undefined) {
      queryParams["limit"] = String(params.limit);
    }

    if (params.page_token !== undefined) {
      queryParams["page_token"] = params.page_token;
    }

    if (params.auto_paginate === true) {
      return autoPaginate<ConversationRecord>(this.client, "/conversations", queryParams);
    }

    return fetchPage<ConversationRecord>(this.client, "/conversations", queryParams);
  }

  async get(params: Extract<ConversationsParams, { action: "get" }>): Promise<ConversationRecord> {
    return this.client.get<ConversationRecord>(`/conversations/${params.conversation_id}`);
  }

  async search(params: Extract<ConversationsParams, { action: "search" }>): Promise<PaginatedResponse<ConversationRecord>> {
    const queryParams: Record<string, string> = {};

    if (params.limit !== undefined) {
      queryParams["limit"] = String(params.limit);
    }

    if (params.page_token !== undefined) {
      queryParams["page_token"] = params.page_token;
    }

    const path = `/conversations/search/${encodeURIComponent(params.query)}`;

    if (params.auto_paginate === true) {
      return autoPaginate<ConversationRecord>(this.client, path, queryParams);
    }

    return fetchPage<ConversationRecord>(this.client, path, queryParams);
  }

  async listEvents(params: Extract<ConversationsParams, { action: "list_events" }>): Promise<PaginatedResponse<EventRecord>> {
    const queryParams: Record<string, string> = {};

    if (params.limit !== undefined) {
      queryParams["limit"] = String(params.limit);
    }

    if (params.page_token !== undefined) {
      queryParams["page_token"] = params.page_token;
    }

    const path = `/conversations/${params.conversation_id}/events`;

    if (params.auto_paginate === true) {
      return autoPaginate<EventRecord>(this.client, path, queryParams);
    }

    return fetchPage<EventRecord>(this.client, path, queryParams);
  }

  async listFollowers(params: Extract<ConversationsParams, { action: "list_followers" }>): Promise<PaginatedResponse<TeammateRecord>> {
    return fetchPage<TeammateRecord>(
      this.client,
      `/conversations/${params.conversation_id}/followers`,
    );
  }

  async listInboxes(params: Extract<ConversationsParams, { action: "list_inboxes" }>): Promise<PaginatedResponse<InboxRecord>> {
    return fetchPage<InboxRecord>(
      this.client,
      `/conversations/${params.conversation_id}/inboxes`,
    );
  }

  async listMessages(params: Extract<ConversationsParams, { action: "list_messages" }>): Promise<PaginatedResponse<MessageRecord>> {
    const queryParams: Record<string, string> = {};

    if (params.limit !== undefined) {
      queryParams["limit"] = String(params.limit);
    }

    if (params.page_token !== undefined) {
      queryParams["page_token"] = params.page_token;
    }

    const path = `/conversations/${params.conversation_id}/messages`;

    if (params.auto_paginate === true) {
      return autoPaginate<MessageRecord>(this.client, path, queryParams);
    }

    return fetchPage<MessageRecord>(this.client, path, queryParams);
  }

  // ---------------------------------------------------------------------------
  // Write actions
  // ---------------------------------------------------------------------------

  async create(params: Extract<ConversationsParams, { action: "create" }>): Promise<ConversationRecord> {
    const body: Record<string, unknown> = {};

    if (params.type !== undefined) body["type"] = params.type;
    if (params.inbox_id !== undefined) body["inbox_id"] = params.inbox_id;
    if (params.teammate_ids !== undefined) body["teammate_ids"] = params.teammate_ids;
    if (params.subject !== undefined) body["subject"] = params.subject;
    if (params.comment !== undefined) body["comment"] = params.comment;
    if (params.tags !== undefined) body["tags"] = params.tags;

    return this.client.post<ConversationRecord>("/conversations", body);
  }

  async update(params: Extract<ConversationsParams, { action: "update" }>): Promise<ConversationRecord> {
    const body: Record<string, unknown> = {};

    if (params.assignee_id !== undefined) body["assignee_id"] = params.assignee_id;
    if (params.inbox_id !== undefined) body["inbox_id"] = params.inbox_id;
    if (params.status !== undefined) body["status"] = params.status;
    if (params.tags !== undefined) body["tags"] = params.tags;
    if (params.custom_fields !== undefined) body["custom_fields"] = params.custom_fields;

    return this.client.patch<ConversationRecord>(
      `/conversations/${params.conversation_id}`,
      body,
    );
  }

  async delete(params: Extract<ConversationsParams, { action: "delete" }>): Promise<Record<string, never>> {
    // Front does not have a true DELETE on conversations — soft-delete via PATCH status=deleted
    return this.client.patch<Record<string, never>>(
      `/conversations/${params.conversation_id}`,
      { status: "deleted" },
    );
  }

  async assign(params: Extract<ConversationsParams, { action: "assign" }>): Promise<Record<string, never>> {
    const body: Record<string, unknown> = {};
    if (params.assignee_id !== undefined) {
      body["assignee_id"] = params.assignee_id;
    }

    return this.client.put<Record<string, never>>(
      `/conversations/${params.conversation_id}/assignee`,
      body,
    );
  }

  async addFollowers(params: Extract<ConversationsParams, { action: "add_followers" }>): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/conversations/${params.conversation_id}/followers`,
      { teammate_ids: params.teammate_ids },
    );
  }

  async removeFollowers(params: Extract<ConversationsParams, { action: "remove_followers" }>): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/conversations/${params.conversation_id}/followers`,
      { teammate_ids: params.teammate_ids },
    );
  }

  async addLink(params: Extract<ConversationsParams, { action: "add_link" }>): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/conversations/${params.conversation_id}/links`,
      { link_id: params.link_id },
    );
  }

  async removeLinks(params: Extract<ConversationsParams, { action: "remove_links" }>): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/conversations/${params.conversation_id}/links`,
      { link_ids: params.link_ids },
    );
  }

  async updateReminders(params: Extract<ConversationsParams, { action: "update_reminders" }>): Promise<Record<string, never>> {
    const body: Record<string, unknown> = {
      teammate_id: params.teammate_id,
    };

    if (params.scheduled_at !== undefined) {
      body["scheduled_at"] = params.scheduled_at;
    }

    return this.client.patch<Record<string, never>>(
      `/conversations/${params.conversation_id}/reminders`,
      body,
    );
  }

  async addTag(params: Extract<ConversationsParams, { action: "add_tag" }>): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/conversations/${params.conversation_id}/tags`,
      { tag_id: params.tag_id },
    );
  }

  async removeTag(params: Extract<ConversationsParams, { action: "remove_tag" }>): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/conversations/${params.conversation_id}/tags`,
      { tag_ids: params.tag_ids },
    );
  }
}
