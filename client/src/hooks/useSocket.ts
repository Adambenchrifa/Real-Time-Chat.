import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  disconnect: () => void;
}

export const useSocket = (token: string | null): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance: Socket = io(SERVER_URL, {
      auth: {
        token,
      },
    });

    setSocket(socketInstance);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    if (socketInstance.connected) {
      setIsConnected(true);
    }

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    disconnect,
  };
};
