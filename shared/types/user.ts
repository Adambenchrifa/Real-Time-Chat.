export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: Date | string;
}

export type PublicUser = Omit<User, 'email'>;

export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}
