import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server.js";
import { createServer } from "../../src/server.js";
import { FrontClient, ApiTokenAuth } from "../../src/client/front-client.js";
import { RateLimiter } from "../../src/client/rate-limiter.js";
import { Logger } from "../../src/utils/logger.js";
import { loadConfig, ConfigSchema } from "../../src/utils/config.js";
import { callTool, toolDefinitions, clearRegisteredTools } from "../../src/tools/register.js";

function makeClient(): FrontClient {
  return new FrontClient(new ApiTokenAuth("test_token"), {
    rateLimiter: new RateLimiter(),
    logger: new Logger("error"),
    retryOptions: { maxRetries: 0 },
  });
}

describe("Integration: Tool Lifecycle", () => {
  beforeEach(() => {
    clearRegisteredTools();
    const client = makeClient();
    const config = ConfigSchema.parse({});
    createServer(client, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers all 26 tools", () => {
    const tools = toolDefinitions();
    expect(tools.length).toBe(26);
  });

  it("all tools have name, description, and inputSchema", () => {
    const tools = toolDefinitions();
    for (const tool of tools) {
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe("string");
      expect(tool.description?.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("all tools have an action property in schema", () => {
    const tools = toolDefinitions();
    for (const tool of tools) {
      const props = tool.inputSchema.properties as Record<string, unknown> | undefined;
      expect(props).toBeDefined();
      expect(props?.["action"]).toBeDefined();
    }
  });

  it("tool call returns structured content on success", async () => {
    server.use(
      http.get("https://api2.frontapp.com/tags", () => {
        return HttpResponse.json({ _results: [{ id: "tag_1", name: "Test" }] });
      }),
    );

    const result = await callTool("tags", { action: "list" });
    expect(result.isError).toBeUndefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0]?.type).toBe("text");
  });

  it("unknown tool returns error with available tools list", async () => {
    const result = await callTool("nonexistent_tool", { action: "list" });
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("Unknown tool");
    expect(text).toContain("conversations");
    expect(text).toContain("tags");
  });

  it("missing required field returns validation error", async () => {
    const result = await callTool("conversations", { action: "get" });
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("conversation_id");
  });
});

describe("Integration: Policy Flow", () => {
  beforeEach(() => {
    clearRegisteredTools();
    const client = makeClient();
    const config = ConfigSchema.parse({});
    createServer(client, config);
  });

  it("read actions are allowed without confirmation", async () => {
    server.use(
      http.get("https://api2.frontapp.com/tags", () => {
        return HttpResponse.json({ _results: [] });
      }),
    );

    const result = await callTool("tags", { action: "list" });
    expect(result.isError).toBeUndefined();
  });

  it("write actions require confirmation", async () => {
    const result = await callTool("tags", {
      action: "create",
      name: "Test Tag",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("CONFIRMATION REQUIRED");
  });

  it("write actions execute after proper two-step confirmation", async () => {
    server.use(
      http.post("https://api2.frontapp.com/tags", () => {
        return HttpResponse.json({ id: "tag_new", name: "Test Tag" });
      }),
    );

    // Step 1: first call without confirm — gets confirmation prompt
    await callTool("tags", {
      action: "create",
      name: "Test Tag",
    });

    // Step 2: second call with confirm=true — executes
    const result = await callTool("tags", {
      action: "create",
      name: "Test Tag",
      confirm: true,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).not.toContain("CONFIRMATION");
  });

  it("confirm=true without prior prompt is blocked (bypass prevention)", async () => {
    const result = await callTool("tags", {
      action: "create",
      name: "Test Tag",
      confirm: true,
    });

    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("CONFIRMATION REQUIRED");
  });

  it("destructive actions are denied by default", async () => {
    const result = await callTool("tags", {
      action: "delete",
      tag_id: "tag_1",
      confirm: true,
    });

    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("DENIED");
    expect(text).toContain("policy.json");
  });
});

describe("Integration: Error Mapping", () => {
  beforeEach(() => {
    clearRegisteredTools();
    const client = makeClient();
    const config = ConfigSchema.parse({});
    createServer(client, config);
  });

  it("maps 400 to invalid request error", async () => {
    server.use(
      http.get("https://api2.frontapp.com/tags", () => {
        return HttpResponse.json(
          { _error: { message: "Bad query parameter" } },
          { status: 400 },
        );
      }),
    );

    const result = await callTool("tags", { action: "list" });
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("Invalid request");
  });

  it("maps 401 to auth error", async () => {
    server.use(
      http.get("https://api2.frontapp.com/tags", () => {
        return HttpResponse.json(
          { _error: { message: "Invalid token" } },
          { status: 401 },
        );
      }),
    );

    const result = await callTool("tags", { action: "list" });
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("Authentication failed");
  });

  it("maps 404 to not found error", async () => {
    server.use(
      http.get("https://api2.frontapp.com/tags/tag_999", () => {
        return HttpResponse.json(
          { _error: { message: "Tag not found" } },
          { status: 404 },
        );
      }),
    );

    const result = await callTool("tags", { action: "get", tag_id: "tag_999" });
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("Not found");
  });

  it("maps 500 to server error", async () => {
    server.use(
      http.get("https://api2.frontapp.com/tags", () => {
        return HttpResponse.json(
          { _error: { message: "Internal error" } },
          { status: 500 },
        );
      }),
    );

    const result = await callTool("tags", { action: "list" });
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toContain("Front API error");
  });
});
