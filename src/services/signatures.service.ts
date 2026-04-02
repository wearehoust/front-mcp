import type { FrontClient } from "../client/front-client.js";
import { fetchPage, autoPaginate, type PaginatedResponse } from "./pagination.js";
import type {
  SignaturesListInput,
  SignaturesGetInput,
  SignaturesUpdateInput,
  SignaturesDeleteInput,
  SignaturesCreateForTeammateInput,
  SignaturesCreateForTeamInput,
} from "../schemas/signatures.schema.js";

export interface Signature {
  id: string;
  name: string;
  body: string;
  sender_info: string | null;
  is_visible_for_all_teammate_channels: boolean;
  is_default: boolean;
  [key: string]: unknown;
}

export class SignaturesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as SignaturesListInput);
      case "get": return this.get(params as unknown as SignaturesGetInput);
      case "update": return this.update(params as unknown as SignaturesUpdateInput);
      case "delete": return this.delete(params as unknown as SignaturesDeleteInput);
      case "create_for_teammate": return this.createForTeammate(params as unknown as SignaturesCreateForTeammateInput);
      case "create_for_team": return this.createForTeam(params as unknown as SignaturesCreateForTeamInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: SignaturesListInput): Promise<PaginatedResponse<Signature>> {
    const params: Record<string, string> = {};
    if (input.page_token !== undefined) {
      params["page_token"] = input.page_token;
    }
    if (input.limit !== undefined) {
      params["limit"] = String(input.limit);
    }

    if (input.auto_paginate === true) {
      return autoPaginate<Signature>(this.client, "/signatures", params);
    }
    return fetchPage<Signature>(this.client, "/signatures", params);
  }

  async get(input: SignaturesGetInput): Promise<Signature> {
    return this.client.get<Signature>(`/signatures/${input.signature_id}`);
  }

  async update(input: SignaturesUpdateInput): Promise<Signature> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.body !== undefined) {
      body["body"] = input.body;
    }
    if (input.sender_info !== undefined) {
      body["sender_info"] = input.sender_info;
    }
    if (input.is_visible_for_all_teammate_channels !== undefined) {
      body["is_visible_for_all_teammate_channels"] = input.is_visible_for_all_teammate_channels;
    }
    if (input.is_default !== undefined) {
      body["is_default"] = input.is_default;
    }
    if (input.channel_ids !== undefined) {
      body["channel_ids"] = input.channel_ids;
    }
    return this.client.patch<Signature>(`/signatures/${input.signature_id}`, body);
  }

  async delete(input: SignaturesDeleteInput): Promise<Record<string, never>> {
    return this.client.delete<Record<string, never>>(`/signatures/${input.signature_id}`);
  }

  async createForTeammate(input: SignaturesCreateForTeammateInput): Promise<Signature> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.body !== undefined) {
      body["body"] = input.body;
    }
    if (input.sender_info !== undefined) {
      body["sender_info"] = input.sender_info;
    }
    if (input.is_visible_for_all_teammate_channels !== undefined) {
      body["is_visible_for_all_teammate_channels"] = input.is_visible_for_all_teammate_channels;
    }
    if (input.is_default !== undefined) {
      body["is_default"] = input.is_default;
    }
    if (input.channel_ids !== undefined) {
      body["channel_ids"] = input.channel_ids;
    }
    return this.client.post<Signature>(`/teammates/${input.teammate_id}/signatures`, body);
  }

  async createForTeam(input: SignaturesCreateForTeamInput): Promise<Signature> {
    const body: Record<string, unknown> = { name: input.name };
    if (input.body !== undefined) {
      body["body"] = input.body;
    }
    if (input.sender_info !== undefined) {
      body["sender_info"] = input.sender_info;
    }
    if (input.is_visible_for_all_teammate_channels !== undefined) {
      body["is_visible_for_all_teammate_channels"] = input.is_visible_for_all_teammate_channels;
    }
    if (input.is_default !== undefined) {
      body["is_default"] = input.is_default;
    }
    if (input.channel_ids !== undefined) {
      body["channel_ids"] = input.channel_ids;
    }
    return this.client.post<Signature>(`/teams/${input.team_id}/signatures`, body);
  }
}
