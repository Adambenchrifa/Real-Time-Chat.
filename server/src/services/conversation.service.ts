import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index';
import {
  conversationParticipants,
  conversations,
  users,
} from '../db/schema/index';
import {
  ConversationWithParticipants,
  CreateConversationDto,
  PublicUser,
  MessageWithSender,
  MessageType,
} from '@chat/shared';

export async function verifyParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);

  return Boolean(row);
}

export async function listConversationsForUser(
  userId: string
): Promise<ConversationWithParticipants[]> {
  const userConversations = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));

  const conversationIds = userConversations.map((c) => c.conversationId);

  if (conversationIds.length === 0) {
    return [];
  }

  const result = await db.query.conversations.findMany({
    where: inArray(conversations.id, conversationIds),
    with: {
      participants: {
        with: {
          user: true,
        },
      },
      messages: {
        orderBy: (msgs, { desc }) => [desc(msgs.createdAt)],
        limit: 1,
        with: {
          sender: true,
        },
      },
    },
  });

  // Sort conversations by the latest message createdAt, or by conversation createdAt if no messages
  const sortedResult = result.sort((a, b) => {
    const timeA =
      a.messages.length > 0
        ? new Date(a.messages[0].createdAt).getTime()
        : new Date(a.createdAt).getTime();
    const timeB =
      b.messages.length > 0
        ? new Date(b.messages[0].createdAt).getTime()
        : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  return sortedResult.map((conv) => {
    const participants: PublicUser[] = conv.participants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      avatarUrl: p.user.avatarUrl,
      createdAt: p.user.createdAt,
    }));

    let lastMessage: MessageWithSender | null = null;
    if (conv.messages.length > 0) {
      const msg = conv.messages[0];
      lastMessage = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        messageType: msg.messageType as MessageType,
        createdAt: msg.createdAt,
        sender: {
          id: msg.sender.id,
          username: msg.sender.username,
          avatarUrl: msg.sender.avatarUrl,
          createdAt: msg.sender.createdAt,
        },
      };
    }

    return {
      id: conv.id,
      title: conv.title,
      isGroup: conv.isGroup,
      createdAt: conv.createdAt,
      participants,
      lastMessage,
    };
  });
}

export async function createConversation(
  data: CreateConversationDto,
  creatorId: string
): Promise<ConversationWithParticipants> {
  const allParticipantIds = Array.from(
    new Set([creatorId, ...data.participantIds])
  );

  if (allParticipantIds.length < 2) {
    throw new Error(
      'A conversation must have at least 2 distinct participants.'
    );
  }

  return await db.transaction(async (tx) => {
    const existingUsers = await tx
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, allParticipantIds));

    if (existingUsers.length !== allParticipantIds.length) {
      throw new Error('One or more participants do not exist');
    }

    const [newConv] = await tx
      .insert(conversations)
      .values({
        title: data.title || null,
        isGroup: data.isGroup || false,
        createdBy: creatorId,
      })
      .returning();

    if (!newConv) {
      throw new Error('Failed to create conversation');
    }

    const participantsToInsert = allParticipantIds.map((pid) => ({
      conversationId: newConv.id,
      userId: pid,
      role: pid === creatorId ? 'admin' : 'member',
    }));

    await tx.insert(conversationParticipants).values(participantsToInsert);

    const result = await tx.query.conversations.findFirst({
      where: eq(conversations.id, newConv.id),
      with: {
        participants: {
          with: {
            user: true,
          },
        },
        messages: {
          orderBy: (msgs, { desc }) => [desc(msgs.createdAt)],
          limit: 1,
          with: {
            sender: true,
          },
        },
      },
    });

    if (!result) {
      throw new Error('Failed to fetch newly created conversation');
    }

    const participants: PublicUser[] = result.participants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      avatarUrl: p.user.avatarUrl,
      createdAt: p.user.createdAt,
    }));

    return {
      id: result.id,
      title: result.title,
      isGroup: result.isGroup,
      createdAt: result.createdAt,
      participants,
      lastMessage: null,
    };
  });
}
