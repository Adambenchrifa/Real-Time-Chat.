import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { messages } from './messages.js';
import { conversationParticipants } from './conversation_participants.js';

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }),
    isGroup: boolean('is_group').default(false).notNull(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('conversations_created_by_idx').on(table.createdBy)]
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [conversations.createdBy],
      references: [users.id],
    }),
    messages: many(messages),
    participants: many(conversationParticipants),
  })
);
