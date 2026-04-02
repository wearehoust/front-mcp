import type { FrontClient } from "../client/front-client.js";
import type {
  RulesListInput,
  RulesListForInboxInput,
  RulesGetInput,
  RulesListForTeammateInput,
  RulesListForTeamInput,
} from "../schemas/rules.schema.js";

export interface Rule {
  id: string;
  name: string;
  is_private: boolean;
  actions: unknown[];
  [key: string]: unknown;
}

export interface RulesListResponse {
  results: Rule[];
}

export class RulesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as RulesListInput);
      case "list_for_inbox": return this.listForInbox(params as unknown as RulesListForInboxInput);
      case "get": return this.get(params as unknown as RulesGetInput);
      case "list_for_teammate": return this.listForTeammate(params as unknown as RulesListForTeammateInput);
      case "list_for_team": return this.listForTeam(params as unknown as RulesListForTeamInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(_input: RulesListInput): Promise<RulesListResponse> {
    const response = await this.client.get<{ _results?: Rule[] }>("/rules");
    return { results: response._results ?? [] };
  }

  async listForInbox(input: RulesListForInboxInput): Promise<RulesListResponse> {
    const response = await this.client.get<{ _results?: Rule[] }>(`/inboxes/${input.inbox_id}/rules`);
    return { results: response._results ?? [] };
  }

  async get(input: RulesGetInput): Promise<Rule> {
    return this.client.get<Rule>(`/rules/${input.rule_id}`);
  }

  async listForTeammate(input: RulesListForTeammateInput): Promise<RulesListResponse> {
    const response = await this.client.get<{ _results?: Rule[] }>(`/teammates/${input.teammate_id}/rules`);
    return { results: response._results ?? [] };
  }

  async listForTeam(input: RulesListForTeamInput): Promise<RulesListResponse> {
    const response = await this.client.get<{ _results?: Rule[] }>(`/teams/${input.team_id}/rules`);
    return { results: response._results ?? [] };
  }
}
