import type { FrontClient } from "../client/front-client.js";

export interface PaginatedResponse<T> {
  results: T[];
  next_page_token?: string;
}

interface FrontPaginatedResponse {
  _results?: unknown[];
  _pagination?: {
    next?: string;
  };
}

function extractPageToken(nextUrl: string | undefined): string | undefined {
  if (nextUrl === undefined) {
    return undefined;
  }
  try {
    const url = new URL(nextUrl);
    return url.searchParams.get("page_token") ?? undefined;
  } catch {
    return undefined;
  }
}

export async function fetchPage<T>(
  client: FrontClient,
  path: string,
  params?: Record<string, string>,
): Promise<PaginatedResponse<T>> {
  const response = await client.get<FrontPaginatedResponse>(path, params);

  return {
    results: (response._results ?? []) as T[],
    next_page_token: extractPageToken(response._pagination?.next),
  };
}

export async function autoPaginate<T>(
  client: FrontClient,
  path: string,
  params?: Record<string, string>,
  maxPages = 10,
): Promise<PaginatedResponse<T>> {
  const allResults: T[] = [];
  let currentParams = { ...params };
  let pagesFetched = 0;
  let nextPageToken: string | undefined;

  do {
    const page = await fetchPage<T>(client, path, currentParams);
    allResults.push(...page.results);
    pagesFetched++;
    nextPageToken = page.next_page_token;

    if (typeof nextPageToken === "string" && pagesFetched < maxPages) {
      currentParams = { ...params, page_token: nextPageToken };
    } else {
      break;
    }
  } while (true);

  return {
    results: allResults,
    next_page_token: pagesFetched >= maxPages ? nextPageToken : undefined,
  };
}
