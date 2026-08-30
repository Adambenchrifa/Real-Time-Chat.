import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listConversationsForUser,
  createConversation,
  verifyParticipant,
} from '../services/conversation.service';
import { db } from '../db/index';
import { messages } from '../db/schema/index';
import { eq } from 'drizzle-orm';
import { MessageType } from '@chat/shared';
import {
  ApiResponse,
  ConversationWithParticipants,
  CreateConversationDto,
  MessageWithSender,
} from '@chat/shared';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  async (
    req: Request,
    res: Response<ApiResponse<ConversationWithParticipants[]>>
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID missing from request',
          },
        });
        return;
      }

      const conversations = await listConversationsForUser(userId);
      res.json({
        success: true,
        data: conversations,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: errorMessage },
      });
    }
  }
);

router.post(
  '/',
  async (
    req: Request,
    res: Response<ApiResponse<ConversationWithParticipants>>
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID missing from request',
          },
        });
        return;
      }

      const data = req.body as CreateConversationDto;

      if (
        !data.participantIds ||
        !Array.isArray(data.participantIds) ||
        data.participantIds.length === 0
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'participantIds must be a non-empty array',
          },
        });
        return;
      }

      const conversation = await createConversation(data, userId);
      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: errorMessage },
      });
    }
  }
);
// Get messages for a conversation
router.get(
  '/:id/messages',
  async (req: Request, res: Response<ApiResponse<MessageWithSender[]>>) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID missing from request',
          },
        });
        return;
      }

      const conversationId = req.params.id;
      const isParticipant = await verifyParticipant(conversationId, userId);
      if (!isParticipant) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
        return;
      }

      const msgs = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: (msg, { asc }) => [asc(msg.createdAt)],
        limit: 100,
        with: { sender: true },
      });

      const result = msgs.map((msg) => ({
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
      }));

      res.json({ success: true, data: result });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: errorMessage },
      });
    }
  }
);

export default router;
