import { eq } from 'drizzle-orm';
import type { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  CreateMessageDto,
  MessageType,
  MessageWithSender,
  PublicUser,
  ServerToClientEvents,
} from '@chat/shared';
import { db } from '../../db/index.js';
import { messages, users } from '../../db/schema/index.js';
import { TokenPayload } from '../../services/auth.service.js';
import { verifyParticipant } from '../../services/conversation.service.js';

export interface SocketData {
  user: TokenPayload;
}

export type ChatServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

const conversationRoom = (conversationId: string): string =>
  `conversation:${conversationId}`;

const getAuthenticatedUser = (socket: ChatSocket): TokenPayload | null => {
  const user = socket.data.user;
  if (!user?.id) {
    socket.emit('error', {
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    return null;
  }
  return user;
};

const toPublicUser = (row: {
  id: string;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
}): PublicUser => ({
  id: row.id,
  username: row.username,
  avatarUrl: row.avatarUrl,
  createdAt: row.createdAt,
});

const loadPublicUser = async (userId: string): Promise<PublicUser | null> => {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ? toPublicUser(row) : null;
};

const validateCreateMessageDto = (
  data: CreateMessageDto
): { ok: true; content: string } | { ok: false; message: string } => {
  if (
    !data ||
    typeof data.conversationId !== 'string' ||
    !data.conversationId
  ) {
    return { ok: false, message: 'conversationId is required' };
  }

  if (typeof data.content !== 'string' || !data.content.trim()) {
    return { ok: false, message: 'content is required' };
  }

  if (data.messageType !== undefined && data.messageType !== MessageType.TEXT) {
    return { ok: false, message: 'Only text messages are supported' };
  }

  return { ok: true, content: data.content.trim() };
};

export const initializeChatEvents = (io: ChatServer): void => {
  io.on('connection', (socket: ChatSocket) => {
    socket.on('join_conversation', async (conversationId: string) => {
      const user = getAuthenticatedUser(socket);
      if (!user) {
        return;
      }

      if (!conversationId) {
        socket.emit('error', {
          message: 'conversationId is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const isParticipant = await verifyParticipant(conversationId, user.id);
      if (!isParticipant) {
        socket.emit('error', {
          message: 'You are not a participant in this conversation',
          code: 'FORBIDDEN',
        });
        return;
      }

      const publicUser = await loadPublicUser(user.id);
      if (!publicUser) {
        socket.emit('error', {
          message: 'User not found',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const room = conversationRoom(conversationId);
      await socket.join(room);
      socket.to(room).emit('user_joined', {
        conversationId,
        user: publicUser,
      });
    });

    socket.on('leave_conversation', async (conversationId: string) => {
      const user = getAuthenticatedUser(socket);
      if (!user) {
        return;
      }

      if (!conversationId) {
        socket.emit('error', {
          message: 'conversationId is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const room = conversationRoom(conversationId);
      socket.to(room).emit('user_left', {
        conversationId,
        userId: user.id,
      });
      await socket.leave(room);
    });

    socket.on('send_message', async (data: CreateMessageDto) => {
      const user = getAuthenticatedUser(socket);
      if (!user) {
        return;
      }

      const validated = validateCreateMessageDto(data);
      if (!validated.ok) {
        socket.emit('error', {
          message: validated.message,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const isParticipant = await verifyParticipant(
        data.conversationId,
        user.id
      );
      if (!isParticipant) {
        socket.emit('error', {
          message: 'You are not a participant in this conversation',
          code: 'FORBIDDEN',
        });
        return;
      }

      try {
        const [inserted] = await db
          .insert(messages)
          .values({
            conversationId: data.conversationId,
            senderId: user.id,
            content: validated.content,
            messageType: MessageType.TEXT,
          })
          .returning();

        const row = await db.query.messages.findFirst({
          where: eq(messages.id, inserted.id),
          with: { sender: true },
        });

        if (!row?.sender) {
          socket.emit('error', {
            message: 'Failed to load message',
            code: 'INTERNAL_ERROR',
          });
          return;
        }

        const payload: MessageWithSender = {
          id: row.id,
          conversationId: row.conversationId,
          senderId: row.senderId,
          content: row.content,
          messageType: row.messageType as MessageType,
          createdAt: row.createdAt,
          sender: toPublicUser(row.sender),
        };

        io.to(conversationRoom(data.conversationId)).emit(
          'new_message',
          payload
        );
      } catch {
        socket.emit('error', {
          message: 'Failed to send message',
          code: 'INTERNAL_ERROR',
        });
      }
    });

    socket.on('typing_start', async (conversationId: string) => {
      const user = getAuthenticatedUser(socket);
      if (!user) {
        return;
      }

      if (!conversationId) {
        socket.emit('error', {
          message: 'conversationId is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const isParticipant = await verifyParticipant(conversationId, user.id);
      if (!isParticipant) {
        socket.emit('error', {
          message: 'You are not a participant in this conversation',
          code: 'FORBIDDEN',
        });
        return;
      }

      socket.to(conversationRoom(conversationId)).emit('typing_start', {
        conversationId,
        userId: user.id,
      });
    });

    socket.on('typing_stop', async (conversationId: string) => {
      const user = getAuthenticatedUser(socket);
      if (!user) {
        return;
      }

      if (!conversationId) {
        socket.emit('error', {
          message: 'conversationId is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const isParticipant = await verifyParticipant(conversationId, user.id);
      if (!isParticipant) {
        socket.emit('error', {
          message: 'You are not a participant in this conversation',
          code: 'FORBIDDEN',
        });
        return;
      }

      socket.to(conversationRoom(conversationId)).emit('typing_stop', {
        conversationId,
        userId: user.id,
      });
    });
  });
};
