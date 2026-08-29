import React from 'react';
import { useSocket } from './hooks/useSocket';

const App: React.FC = () => {
  const { isConnected } = useSocket();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="p-6 rounded-lg bg-gray-800 shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Real-Time Chat</h1>
        <p className="text-xl font-semibold">
          {isConnected ? (
            <span className="text-green-500">
              🟢 Connected to Real-Time Server
            </span>
          ) : (
            <span className="text-red-500">
              🔴 Disconnected from Server
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default App;
