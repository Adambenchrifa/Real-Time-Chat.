import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listConversationsForUser,
  createConversation,
} from '../services/conversation.service';
import {
  ApiResponse,
  ConversationWithParticipants,
  CreateConversationDto,
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

export default router;
