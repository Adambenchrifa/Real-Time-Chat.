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
