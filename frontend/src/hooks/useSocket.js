import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Connect to Socket.io server
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected to server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('Socket disconnected from server');
      }
    };
  }, []);

  return socketRef.current;
};
