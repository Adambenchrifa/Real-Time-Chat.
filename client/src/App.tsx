import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import {
  getSession,
  clearSession,
  getTokenExpiryMs,
  isTokenExpired,
  refreshAccessToken,
} from './services/auth.service';
import { PublicUser, ConversationWithParticipants } from '@chat/shared';
import Login from './screens/Login/Login';
import Register from './screens/Register/Register';
import ChatList from './screens/ChatList/ChatList';
import ChatWindow from './screens/ChatWindow/ChatWindow';

type ViewState = 'login' | 'register' | 'authenticated';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithParticipants | null>(null);
  const handleSelectConversation = (conv: ConversationWithParticipants) =>
    setSelectedConversation(conv);

  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { socket, isConnected, disconnect } = useSocket(token);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const session = getSession();
      let accessToken = session.accessToken;

      if (session.user && accessToken && isTokenExpired(accessToken)) {
        accessToken = await refreshAccessToken();
      }

      const currentSession = getSession();
      if (active && currentSession.user && accessToken) {
        setUser(currentSession.user);
        setToken(accessToken);
        setView('authenticated');
      }
      if (active) setIsInitializing(false);
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const expiresAt = getTokenExpiryMs(token);
    if (!expiresAt) return;

    const delay = Math.max(1_000, expiresAt - Date.now() - 60_000);
    const timer = window.setTimeout(async () => {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        setToken(nextToken);
      } else {
        setUser(null);
        setToken(null);
        setView('login');
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [token]);

  const handleLoginSuccess = (loggedInUser: PublicUser) => {
    const session = getSession();
    setUser(loggedInUser);
    setToken(session.accessToken);
    setView('authenticated');
  };

  const handleRegisterSuccess = (registeredUser: PublicUser) => {
    const session = getSession();
    setUser(registeredUser);
    setToken(session.accessToken);
    setView('authenticated');
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setToken(null);
    disconnect();
    setView('login');
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-300">
        Restoring session...
      </div>
    );
  }

  if (view === 'login') {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setView('register')}
      />
    );
  }

  if (view === 'register') {
    return (
      <Register
        onRegisterSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => setView('login')}
      />
    );
  }

  if (!user || !token) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Real-Time Chat
          </h1>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            ></span>
            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-gray-300">
            Welcome, <span className="font-semibold">{user.username}</span>
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 bg-gray-700 hover:bg-red-600 text-white rounded transition-colors text-sm font-medium border border-gray-600 hover:border-red-500"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {selectedConversation ? (
        <ChatWindow
          user={user}
          token={token}
          socket={socket}
          conversation={selectedConversation}
          onBack={() => setSelectedConversation(null)}
        />
      ) : (
        <ChatList
          user={user}
          token={token}
          socket={socket}
          onSelectConversation={handleSelectConversation}
        />
      )}
    </div>
  );
};

export default App;
