import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { client, db } from '../db/index';
import {
  conversationParticipants,
  conversations,
  users,
} from '../db/schema/index';

const SEED_PASSWORD = 'password123';
const SALT_ROUNDS = 10;

async function findOrCreateUser(
  username: string,
  email: string,
  passwordHash: string
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
    })
    .returning();

  return created;
}

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  const alice = await findOrCreateUser(
    'alice',
    'alice@example.com',
    passwordHash
  );
  const bob = await findOrCreateUser('bob', 'bob@example.com', passwordHash);

  const aliceMemberships = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, alice.id));
  const bobMemberships = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, bob.id));

  const shared = aliceMemberships.find((aliceRow) =>
    bobMemberships.some(
      (bobRow) => bobRow.conversationId === aliceRow.conversationId
    )
  );

  let conversationId: string;

  if (shared) {
    conversationId = shared.conversationId;
  } else {
    const [conversation] = await db
      .insert(conversations)
      .values({
        title: 'Alice & Bob',
        isGroup: false,
        createdBy: alice.id,
      })
      .returning();

    conversationId = conversation.id;

    await db.insert(conversationParticipants).values([
      { conversationId, userId: alice.id, role: 'member' },
      { conversationId, userId: bob.id, role: 'member' },
    ]);
  }

  console.log('Seed complete.');
  console.log('Users: alice / bob (password: password123)');
  console.log('Conversation id:', conversationId);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
