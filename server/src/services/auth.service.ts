import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import {
  RegisterUserDto,
  LoginUserDto,
  PublicUser,
  AuthResponse,
} from '@chat/shared';

export interface TokenPayload {
  id: string;
  email?: string;
  iat?: number;
  exp?: number;
}

const SALT_ROUNDS = 10;

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }
    return secret;
  }

  private static getJwtRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured in environment variables'
      );
    }
    return secret;
  }

  public static generateTokens(user: { id: string; email: string }): {
    accessToken: string;
    refreshToken: string;
  } {
    const jwtSecret = this.getJwtSecret();
    const jwtRefreshSecret = this.getJwtRefreshSecret();

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  public static verifyToken(token: string, isRefresh = false): TokenPayload {
    const secret = isRefresh ? this.getJwtRefreshSecret() : this.getJwtSecret();
    return jwt.verify(token, secret) as TokenPayload;
  }

  public static async registerUser(
    data: RegisterUserDto
  ): Promise<AuthResponse> {
    const { username, email, password } = data;

    // Check if user already exists with same email or username
    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)));

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.email === email) {
        throw new Error('Email already in use');
      }
      if (existing.username === username) {
        throw new Error('Username already in use');
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
      })
      .returning();

    const publicUser: PublicUser = {
      id: newUser.id,
      username: newUser.username,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt,
    };

    const tokens = this.generateTokens({
      id: newUser.id,
      email: newUser.email,
    });

    return {
      user: publicUser,
      ...tokens,
    };
  }

  public static async loginUser(data: LoginUserDto): Promise<AuthResponse> {
    const { email, password } = data;

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const publicUser: PublicUser = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    const tokens = this.generateTokens({ id: user.id, email: user.email });

    return {
      user: publicUser,
      ...tokens,
    };
  }
}
