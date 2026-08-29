import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { db } from '../db/index';
import { users } from '../db/schema/index';
import { eq } from 'drizzle-orm';
import { ApiResponse, PublicUser } from '@chat/shared';

const router = Router();

router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PublicUser>>) => {
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

      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      const publicUser: PublicUser = {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };

      res.json({
        success: true,
        data: publicUser,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
      });
    }
  }
);

export default router;
