import { PublicUser } from './user';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  createdAt: Date | string;
}

export interface CreateMessageDto {
  conversationId: string;
  content: string;
  messageType?: MessageType;
}

export interface MessageWithSender extends Message {
  sender: PublicUser;
}
