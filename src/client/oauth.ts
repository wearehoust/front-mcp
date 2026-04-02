import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { saveTokens, loadTokens, clearTokens, isTokenExpiringSoon, type StoredTokens } from "./token-store.js";
import type { AuthProvider } from "./front-client.js";
import { Logger } from "../utils/logger.js";

const FRONT_AUTH_URL = "https://app.frontapp.com/oauth/authorize";
const FRONT_TOKEN_URL = "https://app.frontapp.com/oauth/token";
const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 60 minutes
const REFRESH_TOKEN_LIFETIME_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectPort: number;
  scopes: string[];
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export class OAuthManager implements AuthProvider {
  private config: OAuthConfig;
  private tokens: StoredTokens | null = null;
  private logger: Logger;

  constructor(config: OAuthConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async getToken(): Promise<string> {
    if (this.tokens === null) {
      this.tokens = await loadTokens();
    }

    if (this.tokens === null) {
      throw new Error(
        "No OAuth tokens available. Run 'front-mcp auth' to authenticate.",
      );
    }

    // Check if access token is expired
    if (Date.now() >= this.tokens.expires_at) {
      this.logger.info("Access token expired, refreshing...");
      await this.refreshAccessToken();
    }

    // Warn if refresh token is expiring soon (24 hours)
    if (isTokenExpiringSoon(this.tokens)) {
      this.logger.warn(
        "Refresh token expires within 24 hours. Run 'front-mcp auth' to re-authenticate.",
      );
    }

    return this.tokens.access_token;
  }

  async startAuthFlow(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const redirectUri = `http://localhost:${this.config.redirectPort}/callback`;

      const httpServer = createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url ?? "/", `http://localhost:${this.config.redirectPort}`);

          if (url.pathname === "/callback") {
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");

            if (typeof error === "string") {
              res.writeHead(400, { "Content-Type": "text/html" });
              res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
              httpServer.close();
              reject(new Error(`OAuth error: ${error}`));
              return;
            }

            if (typeof code !== "string" || code.length === 0) {
              res.writeHead(400, { "Content-Type": "text/html" });
              res.end("<h1>Missing authorization code</h1>");
              httpServer.close();
              reject(new Error("No authorization code received"));
              return;
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<h1>Authentication Successful!</h1><p>You can close this window and return to the terminal.</p>",
            );
            httpServer.close();

            this.exchangeCode(code, redirectUri)
              .then(() => {
                resolve();
              })
              .catch(reject);
          }
        },
      );

      httpServer.listen(this.config.redirectPort, () => {
        const authUrl = new URL(FRONT_AUTH_URL);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", this.config.clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        if (this.config.scopes.length > 0) {
          authUrl.searchParams.set("scope", this.config.scopes.join(" "));
        }

        this.logger.info("Open this URL in your browser to authenticate:");
        process.stderr.write(`\n  ${authUrl.toString()}\n\n`);
      });

      httpServer.on("error", reject);
    });
  }

  async getStatus(): Promise<{
    authenticated: boolean;
    method: string;
    expires_at?: string;
    refresh_expires_at?: string;
  }> {
    const tokens = await loadTokens();
    if (tokens === null) {
      return { authenticated: false, method: "oauth" };
    }

    return {
      authenticated: true,
      method: "oauth",
      expires_at: new Date(tokens.expires_at).toISOString(),
      refresh_expires_at: new Date(tokens.refresh_expires_at).toISOString(),
    };
  }

  async clear(): Promise<void> {
    clearTokens();
    this.tokens = null;
    this.logger.info("OAuth tokens cleared.");
  }

  private async exchangeCode(code: string, redirectUri: string): Promise<void> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    const response = await fetch(FRONT_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as TokenResponse;
    await this.storeTokens(data);
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.tokens === null) {
      throw new Error("No tokens to refresh");
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    const response = await fetch(FRONT_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refresh_token,
      }).toString(),
    });

    if (!response.ok) {
      this.tokens = null;
      throw new Error(
        "Token refresh failed. Please re-authenticate with 'front-mcp auth'.",
      );
    }

    const data = (await response.json()) as TokenResponse;
    await this.storeTokens(data);
  }

  private async storeTokens(data: TokenResponse): Promise<void> {
    const now = Date.now();
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: now + ACCESS_TOKEN_LIFETIME_MS,
      refresh_expires_at: now + REFRESH_TOKEN_LIFETIME_MS,
    };
    await saveTokens(this.tokens);
    this.logger.info("OAuth tokens stored successfully.");
  }
}
