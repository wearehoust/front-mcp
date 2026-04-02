import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  LinksListInput,
  LinksGetInput,
  LinksCreateInput,
  LinksUpdateInput,
  LinksListConversationsInput,
} from "../schemas/links.schema.js";

export interface Link {
  id: string;
  name: string;
  type: string | null;
  external_url: string;
  created_at: number;
  updated_at: number;
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  [key: string]: unknown;
}

export class LinksService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as LinksListInput);
      case "get": return this.get(params as unknown as LinksGetInput);
      case "create": return this.create(params as unknown as LinksCreateInput);
      case "update": return this.update(params as unknown as LinksUpdateInput);
      case "list_conversations": return this.listConversations(params as unknown as LinksListConversationsInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: LinksListInput): Promise<PaginatedResponse<Link>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    if (input.name !== undefined) {
      params["name"] = input.name;
    }
    if (input.type !== undefined) {
      params["type"] = input.type;
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Link>(this.client, "/links", params);
    }
    return fetchPage<Link>(this.client, "/links", params);
  }

  async get(input: LinksGetInput): Promise<Link> {
    return this.client.get<Link>(`/links/${input.link_id}`);
  }

  async create(input: LinksCreateInput): Promise<Link> {
    const body: Record<string, unknown> = {
      name: input.name,
      external_url: input.external_url,
    };
    if (input.type !== undefined) {
      body["type"] = input.type;
    }
    if (input.pattern !== undefined) {
      body["pattern"] = input.pattern;
    }
    return this.client.post<Link>("/links", body);
  }

  async update(input: LinksUpdateInput): Promise<Link> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    return this.client.patch<Link>(`/links/${input.link_id}`, body);
  }

  async listConversations(input: LinksListConversationsInput): Promise<PaginatedResponse<Conversation>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Conversation>(this.client, `/links/${input.link_id}/conversations`, params);
  }
}
