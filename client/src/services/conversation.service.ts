import {
  ConversationWithParticipants,
  CreateConversationDto,
  PublicUser,
} from '@chat/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const fetchConversations = async (
  token: string
): Promise<ConversationWithParticipants[]> => {
  const response = await fetch(`${SERVER_URL}/api/conversations`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error?.message ||
        responseData.message ||
        'Failed to fetch conversations'
    );
  }

  return responseData.data as ConversationWithParticipants[];
};

export const createConversation = async (
  token: string,
  data: CreateConversationDto
): Promise<ConversationWithParticipants> => {
  const response = await fetch(`${SERVER_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error?.message ||
        responseData.message ||
        'Failed to create conversation'
    );
  }

  return responseData.data as ConversationWithParticipants;
};

export const fetchUsers = async (token: string): Promise<PublicUser[]> => {
  const response = await fetch(`${SERVER_URL}/api/users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error?.message ||
        responseData.message ||
        'Failed to fetch users'
    );
  }

  return responseData.data as PublicUser[];
};
