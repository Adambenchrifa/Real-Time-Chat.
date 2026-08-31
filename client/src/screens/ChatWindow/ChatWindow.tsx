import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { ConversationWithParticipants, MessageWithSender, PublicUser } from '@chat/shared';
import { fetchMessages } from '../../services/message.service';

interface ChatWindowProps {
  user: PublicUser;
  token: string;
  socket: Socket | null;
  conversation: ConversationWithParticipants;
  onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  user,
  token,
  socket,
  conversation,
  onBack,
}) => {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchMessages(token, conversation.id)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, conversation.id]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (message: MessageWithSender) => {
      if (message.conversationId === conversation.id) {
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message]
        );
      }
    };
    socket.emit('join_conversation', conversation.id);
    socket.on('new_message', handleMessage);
    return () => {
      socket.emit('leave_conversation', conversation.id);
      socket.off('new_message', handleMessage);
    };
  }, [socket, conversation.id]);

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !socket) return;
    socket.emit('send_message', { conversationId: conversation.id, content });
    setDraft('');
  };

  const other = conversation.participants.find((participant) => participant.id !== user.id);
  const title = conversation.isGroup && conversation.title
    ? conversation.title
    : other?.username || 'Conversation';

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-gray-900">
      <header className="flex items-center gap-3 border-b border-gray-800 bg-gray-900 p-4">
        <button onClick={onBack} className="rounded px-3 py-1 text-gray-300 hover:bg-gray-800" aria-label="Back to conversations">
          ←
        </button>
        <h2 className="font-semibold">{title}</h2>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? <p className="text-gray-400">Loading messages...</p> : null}
        {error ? <p className="text-red-400">{error}</p> : null}
        {!isLoading && !error && messages.length === 0 ? <p className="text-gray-500">No messages yet.</p> : null}
        {messages.map((message) => (
          <div key={message.id} className={message.senderId === user.id ? 'ml-auto max-w-[75%] rounded-lg bg-blue-600 p-3' : 'max-w-[75%] rounded-lg bg-gray-800 p-3'}>
            <p className="mb-1 text-xs text-gray-300">{message.sender.username}</p>
            <p className="break-words">{message.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-800 p-4">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={4000}
          placeholder="Write a message..."
          className="min-w-0 flex-1 rounded bg-gray-800 px-3 py-2 text-white outline-none ring-blue-500 focus:ring-2"
          aria-label="Message"
        />
        <button type="submit" disabled={!draft.trim() || !socket} className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          Send
        </button>
      </form>
    </section>
  );
};

export default ChatWindow;
