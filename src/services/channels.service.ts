import type { FrontClient } from "../client/front-client.js";
import { fetchPage, type PaginatedResponse } from "./pagination.js";
import type {
  ChannelsListInput,
  ChannelsGetInput,
  ChannelsUpdateInput,
  ChannelsValidateInput,
  ChannelsCreateInput,
  ChannelsListForTeammateInput,
  ChannelsListForTeamInput,
} from "../schemas/channels.schema.js";

export interface Channel {
  id: string;
  type: string;
  name?: string;
  address?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ChannelsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as ChannelsListInput);
      case "get": return this.get(params as unknown as ChannelsGetInput);
      case "update": return this.update(params as unknown as ChannelsUpdateInput);
      case "validate": return this.validate(params as unknown as ChannelsValidateInput);
      case "create": return this.create(params as unknown as ChannelsCreateInput);
      case "list_for_teammate": return this.listForTeammate(params as unknown as ChannelsListForTeammateInput);
      case "list_for_team": return this.listForTeam(params as unknown as ChannelsListForTeamInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(_input: ChannelsListInput): Promise<PaginatedResponse<Channel>> {
    return fetchPage<Channel>(this.client, "/channels");
  }

  async get(input: ChannelsGetInput): Promise<Channel> {
    return this.client.get<Channel>(`/channels/${input.channel_id}`);
  }

  async update(input: ChannelsUpdateInput): Promise<Channel> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.settings !== undefined) {
      body["settings"] = input.settings;
    }
    return this.client.patch<Channel>(`/channels/${input.channel_id}`, body);
  }

  async validate(input: ChannelsValidateInput): Promise<Record<string, unknown>> {
    return this.client.post<Record<string, unknown>>(`/channels/${input.channel_id}/validate`, {});
  }

  async create(input: ChannelsCreateInput): Promise<Channel> {
    const inboxId = input.inbox_id as string;
    const body: Record<string, unknown> = { type: input.type };
    if (input.name !== undefined) {
      body["name"] = input.name;
    }
    if (input.settings !== undefined) {
      body["settings"] = input.settings;
    }
    return this.client.post<Channel>(`/inboxes/${inboxId}/channels`, body);
  }

  async listForTeammate(input: ChannelsListForTeammateInput): Promise<PaginatedResponse<Channel>> {
    return fetchPage<Channel>(this.client, `/teammates/${input.teammate_id}/channels`);
  }

  async listForTeam(input: ChannelsListForTeamInput): Promise<PaginatedResponse<Channel>> {
    return fetchPage<Channel>(this.client, `/teams/${input.team_id}/channels`);
  }
}
