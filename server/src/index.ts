import http from 'http';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@chat/shared';
import { initializeChatEvents, type SocketData } from './websocket/events/chat';
import { AuthService } from './services/auth.service';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Socket.io initialization
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
});

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const payload = AuthService.verifyToken(token, false);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(
    'A user connected:',
    socket.id,
    'User payload:',
    socket.data.user
  );

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

initializeChatEvents(io);

// Middleware setup in exact order:
// 1. helmet() (for security headers)
app.use(helmet());

// 2. compression() (for response compression)
app.use(compression());

// 3. cors() (configured to allow requests from the client origin, use env variable)
app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

// 4. express.json() (for parsing JSON bodies)
app.use(express.json());

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
