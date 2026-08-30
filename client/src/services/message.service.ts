import { MessageWithSender } from '@chat/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const fetchMessages = async (
  token: string,
  conversationId: string
): Promise<MessageWithSender[]> => {
  const response = await fetch(
    `${SERVER_URL}/api/conversations/${conversationId}/messages`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? 'Failed to fetch messages');
  }
  return data.data as MessageWithSender[];
};
