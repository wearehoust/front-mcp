import type { FrontClient } from "../client/front-client.js";
import { fetchPage, type PaginatedResponse } from "./pagination.js";
import type {
  CommentsListInput,
  CommentsGetInput,
  CommentsCreateInput,
  CommentsUpdateInput,
  CommentsListMentionsInput,
  CommentsReplyInput,
} from "../schemas/comments.schema.js";

export interface Comment {
  id: string;
  author: {
    id: string;
    [key: string]: unknown;
  };
  body: string;
  posted_at: number;
  [key: string]: unknown;
}

export interface Mention {
  id: string;
  [key: string]: unknown;
}

export class CommentsService {
  private readonly client: FrontClient;

  constructor(client: FrontClient) {
    this.client = client;
  }

  async execute(params: Record<string, unknown>): Promise<unknown> {
    const action = params["action"] as string;
    switch (action) {
      case "list": return this.list(params as unknown as CommentsListInput);
      case "get": return this.get(params as unknown as CommentsGetInput);
      case "create": return this.create(params as unknown as CommentsCreateInput);
      case "update": return this.update(params as unknown as CommentsUpdateInput);
      case "list_mentions": return this.listMentions(params as unknown as CommentsListMentionsInput);
      case "reply": return this.reply(params as unknown as CommentsReplyInput);
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  async list(input: CommentsListInput): Promise<PaginatedResponse<Comment>> {
    return fetchPage<Comment>(this.client, `/conversations/${input.conversation_id}/comments`);
  }

  async get(input: CommentsGetInput): Promise<Comment> {
    return this.client.get<Comment>(`/comments/${input.comment_id}`);
  }

  async create(input: CommentsCreateInput): Promise<Comment> {
    const body: Record<string, unknown> = { body: input.body };
    if (input.author_id !== undefined) {
      body["author_id"] = input.author_id;
    }
    return this.client.post<Comment>(
      `/conversations/${input.conversation_id}/comments`,
      body,
    );
  }

  async update(input: CommentsUpdateInput): Promise<Comment> {
    return this.client.patch<Comment>(`/comments/${input.comment_id}`, {
      body: input.body,
    });
  }

  async listMentions(input: CommentsListMentionsInput): Promise<PaginatedResponse<Mention>> {
    return fetchPage<Mention>(this.client, `/comments/${input.comment_id}/mentions`);
  }

  async reply(input: CommentsReplyInput): Promise<Comment> {
    const body: Record<string, unknown> = { body: input.body };
    if (input.author_id !== undefined) {
      body["author_id"] = input.author_id;
    }
    return this.client.post<Comment>(`/comments/${input.comment_id}/replies`, body);
  }
}
