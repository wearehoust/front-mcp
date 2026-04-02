import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  EventsListInput,
  EventsGetInput,
} from "../schemas/events.schema.js";

export interface FrontEvent {
  id: string;
  type: string;
  emitted_at: number;
  source: {
    [key: string]: unknown;
  };
  target?: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class EventsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as EventsListInput);
      case "get": return this.get(params as unknown as EventsGetInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: EventsListInput): Promise<PaginatedResponse<FrontEvent>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    if (input.types !== undefined && input.types.length > 0) {
      params["types"] = input.types.join(",");
    }
    if (input.before !== undefined) {
      params["before"] = String(input.before);
    }
    if (input.after !== undefined) {
      params["after"] = String(input.after);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<FrontEvent>(this.client, "/events", params);
    }
    return fetchPage<FrontEvent>(this.client, "/events", params);
  }

  async get(input: EventsGetInput): Promise<FrontEvent> {
    return this.client.get<FrontEvent>(`/events/${input.event_id}`);
  }
}
