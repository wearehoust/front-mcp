import type { FrontClient } from "../client/front-client.js";
import type {
  GetMessageInput,
  CreateMessageInput,
  ReplyMessageInput,
  ImportMessageInput,
  ReceiveCustomMessageInput,
  GetSeenStatusInput,
  MarkSeenInput,
} from "../schemas/messages.schema.js";

export interface FrontMessage {
  id: string;
  type: string;
  body: string;
  created_at: number;
  [key: string]: unknown;
}

export interface FrontSeenStatus {
  data: Array<{
    teammate: { id: string };
    first_seen_at: number;
  }>;
}

export class MessagesService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async get(input: GetMessageInput): Promise<FrontMessage> {
    return this.client.get<FrontMessage>(`/messages/${input.message_id}`);
  }

  async create(input: CreateMessageInput): Promise<FrontMessage> {
    const { conversation_id, body, type, options } = input;
    const payload: Record<string, unknown> = { body };
    if (type !== undefined) {
      payload["type"] = type;
    }
    if (options !== undefined) {
      payload["options"] = options;
    }
    return this.client.post<FrontMessage>(
      `/conversations/${conversation_id}/messages`,
      payload,
    );
  }

  async reply(input: ReplyMessageInput): Promise<FrontMessage> {
    const { conversation_id, body, options } = input;
    const payload: Record<string, unknown> = { body, type: "reply" };
    if (options !== undefined) {
      payload["options"] = options;
    }
    return this.client.post<FrontMessage>(
      `/conversations/${conversation_id}/messages`,
      payload,
    );
  }

  async import(input: ImportMessageInput): Promise<FrontMessage> {
    const { inbox_id, body, sender, metadata } = input;
    const payload: Record<string, unknown> = { body, sender };
    if (metadata !== undefined) {
      payload["metadata"] = metadata;
    }
    return this.client.post<FrontMessage>(
      `/inboxes/${inbox_id}/imported_messages`,
      payload,
    );
  }

  async receiveCustom(input: ReceiveCustomMessageInput): Promise<FrontMessage> {
    const { channel_id, body, sender } = input;
    return this.client.post<FrontMessage>(
      `/channels/${channel_id}/messages`,
      { body, sender },
    );
  }

  async getSeenStatus(input: GetSeenStatusInput): Promise<FrontSeenStatus> {
    return this.client.get<FrontSeenStatus>(`/messages/${input.message_id}/seen`);
  }

  async markSeen(input: MarkSeenInput): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(
      `/messages/${input.message_id}/seen`,
    );
  }
}
