import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { FrontClient } from "./client/front-client.js";
import { PolicyEngine } from "./policy/engine.js";
import { createSanitizationConfig, type SanitizationConfig } from "./utils/sanitize.js";
import type { Config } from "./utils/config.js";
import { toolDefinitions, callTool, clearRegisteredTools } from "./tools/register.js";

// Core tool registrations
import { registerConversationsTool } from "./tools/conversations.tool.js";
import { registerMessagesTool } from "./tools/messages.tool.js";
import { registerContactsTool } from "./tools/contacts.tool.js";
import { registerTagsTool } from "./tools/tags.tool.js";
import { registerInboxesTool } from "./tools/inboxes.tool.js";

// Core services
import { ConversationsService } from "./services/conversations.service.js";
import { MessagesService } from "./services/messages.service.js";
import { ContactsService } from "./services/contacts.service.js";
import { TagsService } from "./services/tags.service.js";
import { InboxesService } from "./services/inboxes.service.js";

export function createServer(
  client: FrontClient,
  config: Config,
): Server {
  const server = new Server(
    { name: "front-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const policyPath = config.policy_file.length > 0 ? config.policy_file : undefined;
  const policy = new PolicyEngine(policyPath);
  const sanitizationConfig: SanitizationConfig = createSanitizationConfig(config.sanitization);

  // Clear any previously registered tools (for testing)
  clearRegisteredTools();

  // Initialize services
  const conversationsService = new ConversationsService(client);
  const messagesService = new MessagesService(client);
  const contactsService = new ContactsService(client);
  const tagsService = new TagsService(client);
  const inboxesService = new InboxesService(client);

  // Register core tools (these store in the tool registry)
  registerConversationsTool(server, conversationsService, policy, sanitizationConfig);
  registerMessagesTool(server, messagesService, policy, sanitizationConfig);
  registerContactsTool(server, contactsService, policy, sanitizationConfig);
  registerTagsTool(server, tagsService, policy, sanitizationConfig);
  registerInboxesTool(server, inboxesService, policy, sanitizationConfig);

  // Wire up MCP protocol handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: toolDefinitions() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return callTool(name, (args ?? {}) as Record<string, unknown>);
  });

  return server;
}
