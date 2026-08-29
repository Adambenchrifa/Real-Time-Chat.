import { PublicUser } from './user';
import { MessageWithSender } from './message';

export interface Conversation {
  id: string;
  title?: string | null;
  isGroup: boolean;
  createdAt: Date | string;
}

export interface ConversationWithParticipants extends Conversation {
  participants: PublicUser[];
  lastMessage: MessageWithSender | null;
}

export interface CreateConversationDto {
  participantIds: string[];
  title?: string;
  isGroup?: boolean;
}
