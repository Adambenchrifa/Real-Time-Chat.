import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { getSession, clearSession } from './services/auth.service';
import { PublicUser } from '@chat/shared';
import Login from './screens/Login/Login';
import Register from './screens/Register/Register';

type ViewState = 'login' | 'register' | 'authenticated';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const { isConnected, disconnect } = useSocket(token);

  useEffect(() => {
    const session = getSession();
    if (session.user && session.accessToken) {
      setUser(session.user);
      setToken(session.accessToken);
      setView('authenticated');
    }
  }, []);

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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="p-8 rounded-lg bg-gray-800 shadow-md text-center flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-2">Real-Time Chat</h1>
        <h2 className="text-xl text-gray-300 mb-6">
          Welcome, {user?.username}
        </h2>

        <p className="text-lg font-semibold mb-6">
          {isConnected ? (
            <span className="text-green-500">
              🟢 Connected to Real-Time Server
            </span>
          ) : (
            <span className="text-red-500">🔴 Disconnected from Server</span>
          )}
        </p>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default App;
