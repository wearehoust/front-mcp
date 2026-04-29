import { RateLimiter } from "./rate-limiter.js";
import { withRetry, FrontApiError, NetworkError, type RetryOptions } from "./retry.js";
import { Logger } from "../utils/logger.js";

const BASE_URL = "https://api2.frontapp.com";

// Per RFC 7231 §7.1.3, Retry-After is either a delta-seconds integer or an
// HTTP-date. A naive parseInt() returns NaN for HTTP-date values, which
// silently passes through to setTimeout(NaN) and disables backoff.
export function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;
  const trimmed = header.trim();
  if (trimmed.length === 0) return undefined;

  // delta-seconds form
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }

  // HTTP-date form
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return undefined;
  const seconds = Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
  return seconds;
}

export interface FrontClientOptions {
  rateLimiter: RateLimiter;
  retryOptions?: Partial<RetryOptions>;
  logger: Logger;
}

export interface AuthProvider {
  getToken(): Promise<string>;
}

export class ApiTokenAuth implements AuthProvider {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  getToken(): Promise<string> {
    return Promise.resolve(this.token);
  }
}

export class FrontClient {
  private authProvider: AuthProvider;
  private rateLimiter: RateLimiter;
  private retryOptions: Partial<RetryOptions>;
  private logger: Logger;

  constructor(authProvider: AuthProvider, options: FrontClientOptions) {
    this.authProvider = authProvider;
    this.rateLimiter = options.rateLimiter;
    this.retryOptions = options.retryOptions ?? {};
    this.logger = options.logger;
  }

  setAuthProvider(provider: AuthProvider): void {
    this.authProvider = provider;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("DELETE", path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = this.buildUrl(path, params);

    // Enforce HTTPS
    if (!url.startsWith("https://")) {
      throw new Error("FrontClient requires HTTPS. HTTP is not allowed.");
    }

    return withRetry(async () => {
      // Check rate limit before request
      const delay = this.rateLimiter.checkBeforeRequest(path);
      if (delay > 0) {
        this.logger.debug("Rate limit delay", { delay_ms: delay, path });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      this.rateLimiter.recordRequest(path);

      const token = await this.authProvider.getToken();
      const startTime = Date.now();

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (error: unknown) {
        const rawMessage =
          error instanceof Error ? error.message : "Unknown network error";
        const code =
          error !== null &&
          typeof error === "object" &&
          "code" in error &&
          typeof (error as Record<string, unknown>)["code"] === "string"
            ? ((error as Record<string, unknown>)["code"] as string)
            : undefined;
        let message: string;
        if (code === "ENOTFOUND") {
          message = `Could not resolve host — check your internet connection and that api2.frontapp.com is reachable.`;
        } else if (code === "ECONNREFUSED") {
          message = `Connection refused by api2.frontapp.com — the server may be down or a firewall is blocking the request.`;
        } else if (code === "ETIMEDOUT") {
          message = `Connection timed out reaching api2.frontapp.com — check your network and try again.`;
        } else {
          message = rawMessage;
        }
        throw new NetworkError(`Network error: ${message}`, error);
      }

      const duration = Date.now() - startTime;

      // Update rate limiter from response headers
      this.rateLimiter.updateFromResponse(response.headers);

      this.logger.info("API request", {
        method,
        path,
        status: response.status,
        duration_ms: duration,
      });

      if (!response.ok) {
        let errorBody: { _error?: { message?: string } } = {};
        try {
          errorBody = (await response.json()) as {
            _error?: { message?: string };
          };
        } catch {
          // ignore parse errors
        }

        const frontMessage =
          errorBody._error?.message ?? `HTTP ${response.status}`;

        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfter = parseRetryAfter(retryAfterHeader);

        throw new FrontApiError(
          `Front API error: ${frontMessage} (${response.status})`,
          response.status,
          frontMessage,
          retryAfter,
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    }, this.retryOptions);
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, BASE_URL);
    if (params !== undefined) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}
