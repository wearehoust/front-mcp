import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { OAuthManager } from "../../../src/client/oauth.js";
import { Logger } from "../../../src/utils/logger.js";

const callback = vi.hoisted(() => ({
  handle: null as ((req: IncomingMessage, res: ServerResponse) => void) | null,
  close: vi.fn(),
}));

vi.mock("node:https", () => ({
  createServer: (_options: unknown, handle: typeof callback.handle) => {
    callback.handle = handle;
    return {
      listen: (_port: number, _host: string, ready: () => void) => { ready(); },
      close: callback.close,
      on: vi.fn(),
    };
  },
}));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => "test certificate"),
  mkdtempSync: vi.fn(() => "/unused-oauth-test"),
  rmSync: vi.fn(),
}));
vi.mock("../../../src/client/token-store.js", () => ({
  saveTokens: vi.fn().mockResolvedValue(undefined),
  loadTokens: vi.fn().mockResolvedValue(null),
  clearTokens: vi.fn(),
  isTokenExpiringSoon: vi.fn(() => false),
}));

function invokeCallback(url: string) {
  const response = { writeHead: vi.fn(), end: vi.fn() };
  if (callback.handle === null) throw new Error("OAuth callback not registered");
  callback.handle({ url } as IncomingMessage, response as unknown as ServerResponse);
  return response;
}

describe("OAuth callback lifecycle", () => {
  let authorizationUrl: URL | undefined;

  beforeEach(() => {
    authorizationUrl = undefined;
    callback.close.mockClear();
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      const value = String(chunk).trim();
      if (value.startsWith("https://app.frontapp.com/")) authorizationUrl = new URL(value);
      return true;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exchanges a code only once, including while exchange is pending and after completion", async () => {
    let completeExchange: ((response: Response) => void) | undefined;
    const exchange = new Promise<Response>((resolve) => { completeExchange = resolve; });
    const fetch = vi.fn(async () => (await exchange).clone());
    vi.stubGlobal("fetch", fetch);
    const manager = new OAuthManager({
      clientId: "test-client", clientSecret: "test-secret", redirectPort: 19876, scopes: [],
    }, new Logger("error"));

    const flow = manager.startAuthFlow();
    const state = authorizationUrl?.searchParams.get("state");
    expect(state).toBeTruthy();
    invokeCallback(`/callback?code=first&state=${state}`);
    const duplicate = invokeCallback(`/callback?code=second&state=${state}`);
    if (completeExchange === undefined) throw new Error("Exchange promise not initialized");
    completeExchange(new Response(JSON.stringify({
      access_token: "test-access", refresh_token: "test-refresh", expires_in: 3600,
    }), { status: 200 }));
    await flow;
    const late = invokeCallback(`/callback?code=third&state=${state}`);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(duplicate.writeHead).toHaveBeenCalledWith(409, { "Content-Type": "text/plain" });
    expect(late.writeHead).toHaveBeenCalledWith(409, { "Content-Type": "text/plain" });
  });

  it("rejects a mismatched state without exchanging the code", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const manager = new OAuthManager({
      clientId: "test-client", clientSecret: "test-secret", redirectPort: 19876, scopes: [],
    }, new Logger("error"));

    const flow = manager.startAuthFlow();
    const rejected = expect(flow).rejects.toThrow("state parameter missing or did not match");
    invokeCallback("/callback?code=untrusted&state=wrong");
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
    expect(callback.close).toHaveBeenCalledOnce();
  });
});
