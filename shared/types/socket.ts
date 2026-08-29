import { MessageWithSender, CreateMessageDto } from './message.js';
import { ConversationWithParticipants } from './conversation.js';
import { PublicUser } from './user.js';

export interface ServerToClientEvents {
  new_message: (message: MessageWithSender) => void;
  user_joined: (payload: { conversationId: string; user: PublicUser }) => void;
  user_left: (payload: { conversationId: string; userId: string }) => void;
  conversation_updated: (conversation: ConversationWithParticipants) => void;
  typing_start: (payload: { conversationId: string; userId: string }) => void;
  typing_stop: (payload: { conversationId: string; userId: string }) => void;
  error: (error: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  join_conversation: (conversationId: string) => void;
  leave_conversation: (conversationId: string) => void;
  send_message: (data: CreateMessageDto) => void;
  typing_start: (conversationId: string) => void;
  typing_stop: (conversationId: string) => void;
}
