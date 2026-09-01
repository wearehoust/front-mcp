import { createServer as createHttpsServer } from "node:https";
import { generateKeyPairSync, randomBytes, timingSafeEqual } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { URL } from "node:url";
import { z } from "zod";
import { saveTokens, loadTokens, clearTokens, isTokenExpiringSoon, type StoredTokens } from "./token-store.js";
import type { AuthProvider } from "./front-client.js";
import { Logger } from "../utils/logger.js";
import type { IncomingMessage, ServerResponse } from "node:http";

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

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

type TokenResponse = z.infer<typeof TokenResponseSchema>;

interface CertMaterial {
  key: string;
  cert: string;
}

function generateSelfSignedCert(): CertMaterial {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  // Use a private 0700 temp dir with a random name so the key/cert are not
  // readable by other local users (the previous PID-based filename was
  // predictable, and /tmp is typically world-readable).
  const dir = mkdtempSync(join(tmpdir(), "front-mcp-oauth-"));
  const keyFile = join(dir, "key.pem");
  const certFile = join(dir, "cert.pem");

  writeFileSync(keyFile, privateKey, { mode: 0o600 });

  try {
    execFileSync("openssl", [
      "req", "-new", "-x509",
      "-key", keyFile,
      "-out", certFile,
      "-days", "1",
      "-subj", "/CN=localhost",
      "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ], { stdio: "pipe" });

    const cert = readFileSync(certFile, "utf-8");
    return { key: privateKey, cert };
  } catch (err) {
    const message = err instanceof Error ? err.message : "openssl invocation failed";
    throw new Error(
      `Failed to generate self-signed certificate for OAuth callback. ` +
      `Ensure 'openssl' is installed and on PATH. Underlying error: ${message}`,
    );
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* cleanup */ }
  }
}

export class OAuthManager implements AuthProvider {
  private config: OAuthConfig;
  private tokens: StoredTokens | null = null;
  private logger: Logger;
  // Single in-flight refresh promise so concurrent getToken() callers share
  // one refresh request. Without this, parallel API calls on an expired token
  // each trigger a refresh, racing on the refresh_token (which Front rotates)
  // and likely invalidating each other.
  private refreshInFlight: Promise<void> | null = null;

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

    if (Date.now() >= this.tokens.expires_at) {
      if (this.refreshInFlight === null) {
        this.logger.info("Access token expired, refreshing...");
        this.refreshInFlight = this.refreshAccessToken().finally(() => {
          this.refreshInFlight = null;
        });
      }
      await this.refreshInFlight;
    }

    if (this.tokens === null) {
      // Refresh failed and cleared tokens.
      throw new Error(
        "OAuth token refresh failed. Run 'front-mcp auth' to re-authenticate.",
      );
    }

    if (isTokenExpiringSoon(this.tokens)) {
      this.logger.warn(
        "Refresh token expires within 24 hours. Run 'front-mcp auth' to re-authenticate.",
      );
    }

    return this.tokens.access_token;
  }

  async startAuthFlow(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const redirectUri = `https://localhost:${String(this.config.redirectPort)}/callback`;

      const tlsOptions = generateSelfSignedCert();
      // OAuth 2.0 RFC 6749 §10.12: the `state` parameter binds the
      // authorization request to the callback, preventing CSRF attacks.
      const expectedState = randomBytes(32).toString("base64url");
      const expectedStateBuf = Buffer.from(expectedState, "utf-8");

      let settled = false;
      const finish = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        process.off("SIGINT", shutdown);
        process.off("SIGTERM", shutdown);
        try { httpsServer.close(); } catch { /* already closed */ }
        fn();
      };

      const httpsServer = createHttpsServer(
        tlsOptions,
        (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url ?? "/", `https://localhost:${String(this.config.redirectPort)}`);

          if (url.pathname !== "/callback") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
            return;
          }

          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          const state = url.searchParams.get("state");

          if (typeof error === "string") {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>Authentication Failed</h1>");
            finish(() => { reject(new Error(`OAuth error: ${error}`)); });
            return;
          }

          // Validate state. Use timingSafeEqual to avoid micro-leaks even
          // though state is short-lived; consistent length required.
          const stateBuf = typeof state === "string" ? Buffer.from(state, "utf-8") : null;
          const stateValid =
            stateBuf !== null &&
            stateBuf.length === expectedStateBuf.length &&
            timingSafeEqual(stateBuf, expectedStateBuf);

          if (!stateValid) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>Authentication Failed</h1><p>Invalid state parameter.</p>");
            finish(() => {
              reject(new Error(
                "OAuth callback rejected: state parameter missing or did not match. " +
                "This may indicate a CSRF attempt or that you completed the flow in a different browser session.",
              ));
            });
            return;
          }

          if (typeof code !== "string" || code.length === 0) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>Missing authorization code</h1>");
            finish(() => { reject(new Error("No authorization code received")); });
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<h1>Authentication Successful!</h1><p>You can close this window and return to the terminal.</p>",
          );

          this.exchangeCode(code, redirectUri)
            .then(() => { finish(() => { resolve(); }); })
            .catch((err: unknown) => { finish(() => { reject(err instanceof Error ? err : new Error(String(err))); }); });
        },
      );

      // Timeout after 5 minutes
      const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
      const timeout = setTimeout(() => {
        finish(() => {
          reject(new Error(
            "OAuth callback timed out after 5 minutes. " +
            "Run 'front-mcp auth' again to retry.",
          ));
        });
      }, AUTH_TIMEOUT_MS);

      const shutdown = (): void => {
        finish(() => { reject(new Error("OAuth flow aborted by signal")); });
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);

      // Bind to loopback only. The previous code passed only the port, which
      // node interprets as listening on 0.0.0.0 — that exposed the OAuth
      // callback (and any associated state/code window) to the local network.
      httpsServer.listen(this.config.redirectPort, "127.0.0.1", () => {
        const authUrl = new URL(FRONT_AUTH_URL);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", this.config.clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", expectedState);
        if (this.config.scopes.length > 0) {
          authUrl.searchParams.set("scope", this.config.scopes.join(" "));
        }

        this.logger.info("Open this URL in your browser to authenticate:");
        process.stderr.write(`\n  ${authUrl.toString()}\n\n`);
        process.stderr.write(
          "  Note: Your browser may warn about the self-signed certificate.\n" +
          "  This is expected for localhost — click 'Advanced' and proceed.\n\n",
        );
      });

      httpsServer.on("error", (err) => {
        finish(() => { reject(err); });
      });
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

    this.logger.debug("Token exchange request", {
      url: FRONT_TOKEN_URL,
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      has_secret: this.config.clientSecret.length > 0,
    });

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
      const rawBody = await response.text();
      let detail: string;
      if (rawBody.trimStart().startsWith("<")) {
        detail = rawBody.slice(0, 120).replace(/\s+/g, " ").trim() + (rawBody.length > 120 ? "…" : "");
      } else {
        try {
          const parsed = JSON.parse(rawBody) as Record<string, unknown>;
          const errCode = typeof parsed["error"] === "string" ? parsed["error"] : undefined;
          const errDesc = typeof parsed["error_description"] === "string" ? parsed["error_description"] : undefined;
          if (errCode !== undefined && errDesc !== undefined) {
            detail = `${errCode}: ${errDesc}`;
          } else if (errDesc !== undefined) {
            detail = errDesc;
          } else if (errCode !== undefined) {
            detail = errCode;
          } else {
            detail = rawBody.slice(0, 200);
          }
        } catch {
          detail = rawBody.slice(0, 200);
        }
      }
      throw new Error(
        `Token exchange failed (HTTP ${response.status}): ${detail}. ` +
        `Check your client ID and secret.`,
      );
    }

    const data = await this.parseTokenResponse(response);
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
        `Token refresh failed (HTTP ${response.status.toString()}). Please re-authenticate with 'front-mcp auth'.`,
      );
    }

    const data = await this.parseTokenResponse(response);
    await this.storeTokens(data);
  }

  private async parseTokenResponse(response: Response): Promise<TokenResponse> {
    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid JSON";
      throw new Error(`Token endpoint returned non-JSON response: ${message}`);
    }
    const result = TokenResponseSchema.safeParse(json);
    if (!result.success) {
      throw new Error(
        "Token endpoint returned an unexpected payload (missing access_token or refresh_token).",
      );
    }
    return result.data;
  }

  private async storeTokens(data: TokenResponse): Promise<void> {
    const now = Date.now();
    // Front documents access tokens at 60 minutes; honor `expires_in` when
    // present (in seconds) so we don't desync if Front changes the lifetime.
    const accessLifetimeMs = typeof data.expires_in === "number" && data.expires_in > 0
      ? data.expires_in * 1000
      : ACCESS_TOKEN_LIFETIME_MS;
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: now + accessLifetimeMs,
      refresh_expires_at: now + REFRESH_TOKEN_LIFETIME_MS,
    };
    await saveTokens(this.tokens);
    this.logger.info("OAuth tokens stored successfully.");
  }
}
