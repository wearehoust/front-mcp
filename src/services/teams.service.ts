import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  TeamsListInput,
  TeamsGetInput,
  TeamsAddTeammatesInput,
  TeamsRemoveTeammatesInput,
} from "../schemas/teams.schema.js";

export interface Team {
  id: string;
  name: string;
  [key: string]: unknown;
}

export class TeamsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as TeamsListInput);
      case "get": return this.get(params as unknown as TeamsGetInput);
      case "add_teammates": return this.addTeammates(params as unknown as TeamsAddTeammatesInput);
      case "remove_teammates": return this.removeTeammates(params as unknown as TeamsRemoveTeammatesInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: TeamsListInput): Promise<PaginatedResponse<Team>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Team>(this.client, "/teams", params);
    }
    return fetchPage<Team>(this.client, "/teams", params);
  }

  async get(input: TeamsGetInput): Promise<Team> {
    return this.client.get<Team>(`/teams/${input.team_id}`);
  }

  async addTeammates(input: TeamsAddTeammatesInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/teams/${input.team_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }

  async removeTeammates(input: TeamsRemoveTeammatesInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/teams/${input.team_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }
}
