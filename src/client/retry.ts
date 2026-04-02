export interface RetryOptions {
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  backoffBaseMs: 1000,
  backoffMaxMs: 60000,
};

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class FrontApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly frontMessage: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "FrontApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "NetworkError";
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof FrontApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }
  if (error instanceof NetworkError) {
    return true;
  }
  return false;
}

function getRetryAfter(error: unknown): number | undefined {
  if (error instanceof FrontApiError) {
    return error.retryAfter;
  }
  return undefined;
}

function calculateBackoff(
  attempt: number,
  options: RetryOptions,
  retryAfterMs?: number,
): number {
  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    return retryAfterMs;
  }

  // Exponential backoff with jitter
  const exponentialDelay = options.backoffBaseMs * Math.pow(2, attempt);
  const jitter = Math.random() * options.backoffBaseMs;
  return Math.min(exponentialDelay + jitter, options.backoffMaxMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt >= opts.maxRetries) {
        break;
      }

      if (!isRetryable(error)) {
        throw error;
      }

      const retryAfterSec = getRetryAfter(error);
      const retryAfterMs =
        retryAfterSec !== undefined ? retryAfterSec * 1000 : undefined;
      const delay = calculateBackoff(attempt, opts, retryAfterMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
