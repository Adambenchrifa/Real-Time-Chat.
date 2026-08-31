import {
  LoginUserDto,
  RegisterUserDto,
  AuthResponse,
  PublicUser,
} from '@chat/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const login = async (data: LoginUserDto): Promise<AuthResponse> => {
  const response = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error?.message || responseData.message || 'Login failed'
    );
  }

  return responseData.data as AuthResponse;
};

export const register = async (
  data: RegisterUserDto
): Promise<AuthResponse> => {
  const response = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error?.message ||
        responseData.message ||
        'Registration failed'
    );
  }

  return responseData.data as AuthResponse;
};

export const saveSession = (auth: AuthResponse): void => {
  localStorage.setItem('accessToken', auth.accessToken);
  localStorage.setItem('refreshToken', auth.refreshToken);
  localStorage.setItem('user', JSON.stringify(auth.user));
};

export const clearSession = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getSession = (): {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
} => {
  const userStr = localStorage.getItem('user');
  let user: PublicUser | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      console.error('Failed to parse user from localStorage');
    }
  }

  return {
    user,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  };
};

export const getTokenExpiryMs = (token: string): number | null => {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = base64Payload.padEnd(
      base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
      '='
    );
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const expiresAt = getTokenExpiryMs(token);
  return expiresAt === null || expiresAt <= Date.now() + 30_000;
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const { refreshToken } = getSession();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${SERVER_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const responseData = await response.json();
    if (!response.ok || !responseData.data?.accessToken) {
      throw new Error('Refresh token rejected');
    }

    localStorage.setItem('accessToken', responseData.data.accessToken);
    if (responseData.data.refreshToken) {
      localStorage.setItem('refreshToken', responseData.data.refreshToken);
    }
    return responseData.data.accessToken as string;
  } catch {
    clearSession();
    return null;
  }
};
