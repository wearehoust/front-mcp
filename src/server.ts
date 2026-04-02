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

// Tool registrations
import { registerConversationsTool } from "./tools/conversations.tool.js";
import { registerMessagesTool } from "./tools/messages.tool.js";
import { registerContactsTool } from "./tools/contacts.tool.js";
import { registerTagsTool } from "./tools/tags.tool.js";
import { registerInboxesTool } from "./tools/inboxes.tool.js";
import { registerAccountsTool } from "./tools/accounts.tool.js";
import { registerAnalyticsTool } from "./tools/analytics.tool.js";
import { registerChannelsTool } from "./tools/channels.tool.js";
import { registerCommentsTool } from "./tools/comments.tool.js";
import { registerContactGroupsTool } from "./tools/contact_groups.tool.js";
import { registerContactListsTool } from "./tools/contact_lists.tool.js";
import { registerContactNotesTool } from "./tools/contact_notes.tool.js";
import { registerCustomFieldsTool } from "./tools/custom_fields.tool.js";
import { registerDraftsTool } from "./tools/drafts.tool.js";
import { registerEventsTool } from "./tools/events.tool.js";
import { registerKnowledgeBasesTool } from "./tools/knowledge-bases.tool.js";
import { registerLinksTool } from "./tools/links.tool.js";
import { registerMessageTemplateFoldersTool } from "./tools/message-template-folders.tool.js";
import { registerMessageTemplatesTool } from "./tools/message-templates.tool.js";
import { registerRulesTool } from "./tools/rules.tool.js";
import { registerShiftsTool } from "./tools/shifts.tool.js";
import { registerSignaturesTool } from "./tools/signatures.tool.js";
import { registerTeammateGroupsTool } from "./tools/teammate-groups.tool.js";
import { registerTeammatesTool } from "./tools/teammates.tool.js";
import { registerTeamsTool } from "./tools/teams.tool.js";
import { registerTokenIdentityTool } from "./tools/token-identity.tool.js";

// Services
import { ConversationsService } from "./services/conversations.service.js";
import { MessagesService } from "./services/messages.service.js";
import { ContactsService } from "./services/contacts.service.js";
import { TagsService } from "./services/tags.service.js";
import { InboxesService } from "./services/inboxes.service.js";
import { AccountsService } from "./services/accounts.service.js";
import { AnalyticsService } from "./services/analytics.service.js";
import { ChannelsService } from "./services/channels.service.js";
import { CommentsService } from "./services/comments.service.js";
import { ContactGroupsService } from "./services/contact_groups.service.js";
import { ContactListsService } from "./services/contact_lists.service.js";
import { ContactNotesService } from "./services/contact_notes.service.js";
import { CustomFieldsService } from "./services/custom_fields.service.js";
import { DraftsService } from "./services/drafts.service.js";
import { EventsService } from "./services/events.service.js";
import { KnowledgeBasesService } from "./services/knowledge-bases.service.js";
import { LinksService } from "./services/links.service.js";
import { MessageTemplateFoldersService } from "./services/message-template-folders.service.js";
import { MessageTemplatesService } from "./services/message-templates.service.js";
import { RulesService } from "./services/rules.service.js";
import { ShiftsService } from "./services/shifts.service.js";
import { SignaturesService } from "./services/signatures.service.js";
import { TeammateGroupsService } from "./services/teammate-groups.service.js";
import { TeammatesService } from "./services/teammates.service.js";
import { TeamsService } from "./services/teams.service.js";
import { TokenIdentityService } from "./services/token-identity.service.js";

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

  clearRegisteredTools();

  // Initialize all 26 services
  const s = {
    conversations: new ConversationsService(client),
    messages: new MessagesService(client),
    contacts: new ContactsService(client),
    tags: new TagsService(client),
    inboxes: new InboxesService(client),
    accounts: new AccountsService(client),
    analytics: new AnalyticsService(client),
    channels: new ChannelsService(client),
    comments: new CommentsService(client),
    contactGroups: new ContactGroupsService(client),
    contactLists: new ContactListsService(client),
    contactNotes: new ContactNotesService(client),
    customFields: new CustomFieldsService(client),
    drafts: new DraftsService(client),
    events: new EventsService(client),
    knowledgeBases: new KnowledgeBasesService(client),
    links: new LinksService(client),
    messageTemplateFolders: new MessageTemplateFoldersService(client),
    messageTemplates: new MessageTemplatesService(client),
    rules: new RulesService(client),
    shifts: new ShiftsService(client),
    signatures: new SignaturesService(client),
    teammateGroups: new TeammateGroupsService(client),
    teammates: new TeammatesService(client),
    teams: new TeamsService(client),
    tokenIdentity: new TokenIdentityService(client),
  };

  // Register all 26 tools
  registerConversationsTool(server, s.conversations, policy, sanitizationConfig);
  registerMessagesTool(server, s.messages, policy, sanitizationConfig);
  registerContactsTool(server, s.contacts, policy, sanitizationConfig);
  registerTagsTool(server, s.tags, policy, sanitizationConfig);
  registerInboxesTool(server, s.inboxes, policy, sanitizationConfig);
  registerAccountsTool(server, s.accounts, policy, sanitizationConfig);
  registerAnalyticsTool(server, s.analytics, policy, sanitizationConfig);
  registerChannelsTool(server, s.channels, policy, sanitizationConfig);
  registerCommentsTool(server, s.comments, policy, sanitizationConfig);
  registerContactGroupsTool(server, s.contactGroups, policy, sanitizationConfig);
  registerContactListsTool(server, s.contactLists, policy, sanitizationConfig);
  registerContactNotesTool(server, s.contactNotes, policy, sanitizationConfig);
  registerCustomFieldsTool(server, s.customFields, policy, sanitizationConfig);
  registerDraftsTool(server, s.drafts, policy, sanitizationConfig);
  registerEventsTool(server, s.events, policy, sanitizationConfig);
  registerKnowledgeBasesTool(server, s.knowledgeBases, policy, sanitizationConfig);
  registerLinksTool(server, s.links, policy, sanitizationConfig);
  registerMessageTemplateFoldersTool(server, s.messageTemplateFolders, policy, sanitizationConfig);
  registerMessageTemplatesTool(server, s.messageTemplates, policy, sanitizationConfig);
  registerRulesTool(server, s.rules, policy, sanitizationConfig);
  registerShiftsTool(server, s.shifts, policy, sanitizationConfig);
  registerSignaturesTool(server, s.signatures, policy, sanitizationConfig);
  registerTeammateGroupsTool(server, s.teammateGroups, policy, sanitizationConfig);
  registerTeammatesTool(server, s.teammates, policy, sanitizationConfig);
  registerTeamsTool(server, s.teams, policy, sanitizationConfig);
  registerTokenIdentityTool(server, s.tokenIdentity, policy, sanitizationConfig);

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
