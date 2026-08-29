import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversationParticipants } from '../db/schema/index.js';

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
