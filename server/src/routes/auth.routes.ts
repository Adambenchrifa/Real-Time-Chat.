import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import {
  RegisterUserDto,
  LoginUserDto,
  ApiResponse,
  AuthResponse,
} from '@chat/shared';

const router = Router();

router.post(
  '/register',
  async (
    req: Request<object, ApiResponse<AuthResponse>, RegisterUserDto>,
    res: Response<ApiResponse<AuthResponse>>
  ) => {
    try {
      const { username, email, password } = req.body || {};

      if (
        typeof username !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        username.trim().length < 3 ||
        username.trim().length > 50 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        password.length < 8 ||
        password.length > 128
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Username, email, and password are invalid or missing',
          },
        });
        return;
      }

      const authData = await AuthService.registerUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      res.status(201).json({
        success: true,
        data: authData,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      const duplicateAccount = /already in use/i.test(errorMessage);
      res.status(duplicateAccount ? 409 : 400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: duplicateAccount
            ? 'Unable to create an account with those details'
            : errorMessage,
        },
      });
    }
  }
);

router.post(
  '/login',
  async (
    req: Request<object, ApiResponse<AuthResponse>, LoginUserDto>,
    res: Response<ApiResponse<AuthResponse>>
  ) => {
    try {
      const { email, password } = req.body || {};

      if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        password.length === 0
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Email and password are invalid or missing',
          },
        });
        return;
      }

      const authData = await AuthService.loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      res.json({
        success: true,
        data: authData,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: errorMessage,
        },
      });
    }
  }
);

router.post(
  '/refresh',
  (
    req: Request<
      object,
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { refreshToken?: string }
    >,
    res: Response<ApiResponse<{ accessToken: string; refreshToken: string }>>
  ) => {
    try {
      const { refreshToken } = req.body || {};

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      const tokens = await AuthService.refreshTokens(refreshToken);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Invalid or expired refresh token';
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: errorMessage,
        },
      });
    }
  }
);

export default router;
