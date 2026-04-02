import type { FrontClient } from "../client/front-client.js";

export interface TokenIdentity {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
}

export class TokenIdentityService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "get": return this.get();
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async get(): Promise<TokenIdentity> {
    return this.client.get<TokenIdentity>("/me");
  }
}
