import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  TeammateGroupsListInput,
  TeammateGroupsGetInput,
  TeammateGroupsCreateInput,
  TeammateGroupsUpdateInput,
  TeammateGroupsDeleteInput,
  TeammateGroupsListInboxesInput,
  TeammateGroupsAddInboxesInput,
  TeammateGroupsRemoveInboxesInput,
  TeammateGroupsListTeammatesInput,
  TeammateGroupsAddTeammatesInput,
  TeammateGroupsRemoveTeammatesInput,
  TeammateGroupsListTeamsInput,
  TeammateGroupsAddTeamsInput,
  TeammateGroupsRemoveTeamsInput,
} from "../schemas/teammate-groups.schema.js";

export interface TeammateGroup {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Inbox {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Teammate {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
}

export interface Team {
  id: string;
  name: string;
  [key: string]: unknown;
}

export class TeammateGroupsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as TeammateGroupsListInput);
      case "get": return this.get(params as unknown as TeammateGroupsGetInput);
      case "create": return this.create(params as unknown as TeammateGroupsCreateInput);
      case "update": return this.update(params as unknown as TeammateGroupsUpdateInput);
      case "delete": return this.delete(params as unknown as TeammateGroupsDeleteInput);
      case "list_inboxes": return this.listInboxes(params as unknown as TeammateGroupsListInboxesInput);
      case "add_inboxes": return this.addInboxes(params as unknown as TeammateGroupsAddInboxesInput);
      case "remove_inboxes": return this.removeInboxes(params as unknown as TeammateGroupsRemoveInboxesInput);
      case "list_teammates": return this.listTeammates(params as unknown as TeammateGroupsListTeammatesInput);
      case "add_teammates": return this.addTeammates(params as unknown as TeammateGroupsAddTeammatesInput);
      case "remove_teammates": return this.removeTeammates(params as unknown as TeammateGroupsRemoveTeammatesInput);
      case "list_teams": return this.listTeams(params as unknown as TeammateGroupsListTeamsInput);
      case "add_teams": return this.addTeams(params as unknown as TeammateGroupsAddTeamsInput);
      case "remove_teams": return this.removeTeams(params as unknown as TeammateGroupsRemoveTeamsInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: TeammateGroupsListInput): Promise<PaginatedResponse<TeammateGroup>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<TeammateGroup>(this.client, "/teammate_groups", params);
    }
    return fetchPage<TeammateGroup>(this.client, "/teammate_groups", params);
  }

  async get(input: TeammateGroupsGetInput): Promise<TeammateGroup> {
    return this.client.get<TeammateGroup>(`/teammate_groups/${input.group_id}`);
  }

  async create(input: TeammateGroupsCreateInput): Promise<TeammateGroup> {
    return this.client.post<TeammateGroup>("/teammate_groups", { name: input.name });
  }

  async update(input: TeammateGroupsUpdateInput): Promise<TeammateGroup> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    return this.client.patch<TeammateGroup>(`/teammate_groups/${input.group_id}`, body);
  }

  async delete(input: TeammateGroupsDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/teammate_groups/${input.group_id}`);
  }

  async listInboxes(input: TeammateGroupsListInboxesInput): Promise<PaginatedResponse<Inbox>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Inbox>(this.client, `/teammate_groups/${input.group_id}/inboxes`, params);
  }

  async addInboxes(input: TeammateGroupsAddInboxesInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/teammate_groups/${input.group_id}/inboxes`,
      { inbox_ids: input.inbox_ids },
    );
  }

  async removeInboxes(input: TeammateGroupsRemoveInboxesInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/teammate_groups/${input.group_id}/inboxes`,
      { inbox_ids: input.inbox_ids },
    );
  }

  async listTeammates(input: TeammateGroupsListTeammatesInput): Promise<PaginatedResponse<Teammate>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Teammate>(this.client, `/teammate_groups/${input.group_id}/teammates`, params);
  }

  async addTeammates(input: TeammateGroupsAddTeammatesInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/teammate_groups/${input.group_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }

  async removeTeammates(input: TeammateGroupsRemoveTeammatesInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/teammate_groups/${input.group_id}/teammates`,
      { teammate_ids: input.teammate_ids },
    );
  }

  async listTeams(input: TeammateGroupsListTeamsInput): Promise<PaginatedResponse<Team>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }
    return fetchPage<Team>(this.client, `/teammate_groups/${input.group_id}/teams`, params);
  }

  async addTeams(input: TeammateGroupsAddTeamsInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/teammate_groups/${input.group_id}/teams`,
      { team_ids: input.team_ids },
    );
  }

  async removeTeams(input: TeammateGroupsRemoveTeamsInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(
      `/teammate_groups/${input.group_id}/teams`,
      { team_ids: input.team_ids },
    );
  }
}
