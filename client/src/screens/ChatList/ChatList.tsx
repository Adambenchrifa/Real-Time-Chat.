import React, { useState, useEffect, useCallback } from 'react';
import { ConversationWithParticipants, PublicUser } from '@chat/shared';
import {
  fetchConversations,
  fetchUsers,
  createConversation,
} from '../../services/conversation.service';
import type { Socket } from 'socket.io-client';

interface ChatListProps {
  onSelectConversation: (conv: ConversationWithParticipants) => void;
  user: PublicUser;
  token: string;
  socket: Socket | null;
}

const ChatList: React.FC<ChatListProps> = ({
  user,
  token,
  socket,
  onSelectConversation,
}) => {
  const [conversations, setConversations] = useState<
    ConversationWithParticipants[]
  >([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewChatPanel, setShowNewChatPanel] = useState(false);


  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchConversations(token);
      setConversations(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (showNewChatPanel) {
      const loadUsers = async () => {
        try {
          const data = await fetchUsers(token);
          setUsers(data);
        } catch (err) {
          console.error('Failed to load users', err);
        }
      };
      loadUsers();
    }
  }, [showNewChatPanel, token]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      loadConversations();
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, loadConversations]);

  const handleStartConversation = async (participantId: string) => {
    try {
      await createConversation(token, { participantIds: [participantId] });
      setShowNewChatPanel(false);
      loadConversations();
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const getOtherParticipant = (participants: PublicUser[]) => {
    return participants.find((p) => p.id !== user.id) || participants[0];
  };

  const formatTime = (dateString?: string | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 w-full max-w-md mx-auto border-x border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <h2 className="text-xl font-bold">Chats</h2>
        <button
          onClick={() => setShowNewChatPanel(!showNewChatPanel)}
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-semibold"
        >
          {showNewChatPanel ? 'Cancel' : 'New Chat'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && !conversations.length ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={loadConversations}
              className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
            >
              Retry
            </button>
          </div>
        ) : showNewChatPanel ? (
          <div className="p-4">
            <h3 className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-4">
              Select User
            </h3>
            <div className="flex flex-col gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartConversation(u.id)}
                  className="flex items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold mr-3 flex-shrink-0">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{u.username}</span>
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No other users found.
                </p>
              )}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="mb-4">No conversations yet.</p>
            <button
              onClick={() => setShowNewChatPanel(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Start one now
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => {
              const otherUser = getOtherParticipant(conv.participants);
              const displayName =
                conv.isGroup && conv.title ? conv.title : otherUser.username;
              const displayInitial = displayName.charAt(0).toUpperCase();

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className="flex items-center p-4 hover:bg-gray-800 transition-colors border-b border-gray-800/50 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-lg mr-4 flex-shrink-0">
                    {displayInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-gray-100 truncate pr-2">
                        {displayName}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTime(
                          conv.lastMessage?.createdAt || conv.createdAt
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
