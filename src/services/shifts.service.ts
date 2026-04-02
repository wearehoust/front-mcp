import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  ShiftsListInput,
  ShiftsGetInput,
  ShiftsCreateInput,
  ShiftsUpdateInput,
  ShiftsListTeammatesInput,
  ShiftsAddTeammatesInput,
  ShiftsRemoveTeammatesInput,
} from "../schemas/shifts.schema.js";

export interface Shift {
  id: string;
  name: string;
  color: string;
  timezone: string;
  times: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface Teammate {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
}

export class ShiftsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as ShiftsListInput);
      case "get": return this.get(params as unknown as ShiftsGetInput);
      case "create": return this.create(params as unknown as ShiftsCreateInput);
      case "update": return this.update(params as unknown as ShiftsUpdateInput);
      case "list_teammates": return this.listTeammates(params as unknown as ShiftsListTeammatesInput);
      case "add_teammates": return this.addTeammates(params as unknown as ShiftsAddTeammatesInput);
      case "remove_teammates": return this.removeTeammates(params as unknown as ShiftsRemoveTeammatesInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: ShiftsListInput): Promise<PaginatedResponse<Shift>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Shift>(this.client, "/shifts", params);
    }
    return fetchPage<Shift>(this.client, "/shifts", params);
  }

  async get(input: ShiftsGetInput): Promise<Shift> {
    return this.client.get<Shift>(`/shifts/${input.shift_id}`);
  }

  async create(input: ShiftsCreateInput): Promise<Shift> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.color !== undefined) {
      body["color"] = input.color;
    }
    if (input.timezone !== undefined) {
      body["timezone"] = input.timezone;
    }
    if (input.times !== undefined) {
      body["times"] = input.times;
    }
    return this.client.post<Shift>("/shifts", body);
  }

  async update(input: ShiftsUpdateInput): Promise<Shift> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.color !== undefined) {
      body["color"] = input.color;
    }
    if (input.timezone !== undefined) {
      body["timezone"] = input.timezone;
    }
    if (input.times !== undefined) {
      body["times"] = input.times;
    }
    return this.client.patch<Shift>(`/shifts/${input.shift_id}`, body);
  }

  async listTeammates(input: ShiftsListTeammatesInput): Promise<PaginatedResponse<Teammate>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Teammate>(this.client, `/shifts/${input.shift_id}/teammates`, params);
  }

  async addTeammates(input: ShiftsAddTeammatesInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/shifts/${input.shift_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }

  async removeTeammates(input: ShiftsRemoveTeammatesInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/shifts/${input.shift_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }
}
