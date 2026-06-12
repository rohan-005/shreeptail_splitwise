import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room scoped to expense
    socket.on('join_expense', (expenseId) => {
      const room = `expense_${expenseId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    // Leave room scoped to expense
    socket.on('leave_expense', (expenseId) => {
      const room = `expense_${expenseId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left room: ${room}`);
    });

    // Handle typing indicators
    socket.on('typing', ({ expenseId, userName }) => {
      socket.to(`expense_${expenseId}`).emit('typing', { userName });
    });

    socket.on('stop_typing', ({ expenseId }) => {
      socket.to(`expense_${expenseId}`).emit('stop_typing');
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};
