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
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Username, email, and password are required',
          },
        });
        return;
      }

      const authData = await AuthService.registerUser({
        username,
        email,
        password,
      });

      res.status(201).json({
        success: true,
        data: authData,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: errorMessage,
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
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Email and password are required',
          },
        });
        return;
      }

      const authData = await AuthService.loginUser({ email, password });

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
      const { refreshToken } = req.body;

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

      const payload = AuthService.verifyToken(refreshToken, true);
      if (!payload.id) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
        });
        return;
      }

      // Generate new tokens
      const tokens = AuthService.generateTokens({
        id: payload.id,
        email: payload.email || '',
      });

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
