import { RateLimiter } from "./rate-limiter.js";
import { withRetry, FrontApiError, NetworkError, type RetryOptions } from "./retry.js";
import { Logger } from "../utils/logger.js";

const BASE_URL = "https://api2.frontapp.com";

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
        const message =
          error instanceof Error ? error.message : "Unknown network error";
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
        const retryAfter =
          retryAfterHeader !== null
            ? parseInt(retryAfterHeader, 10)
            : undefined;

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
