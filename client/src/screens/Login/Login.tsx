import React, { useState } from 'react';
import { login, saveSession } from '../../services/auth.service';
import { PublicUser } from '@chat/shared';

interface LoginProps {
  onLoginSuccess: (user: PublicUser) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const authResponse = await login({ email, password });
      saveSession(authResponse);
      onLoginSuccess(authResponse.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during login.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="p-8 rounded-lg bg-gray-800 shadow-md w-96">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>

        {error && (
          <div className="bg-red-500/20 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-400">Don't have an account? </span>
          <button
            onClick={onSwitchToRegister}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
