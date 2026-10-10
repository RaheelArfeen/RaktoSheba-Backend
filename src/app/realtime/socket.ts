import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifySocketToken } from '../utils/jwt';

// Live notifications. The socket server only exists when the API runs as a long-lived
// Node process (`npm run dev` / `npm start`). On Vercel's serverless functions it is never
// started, `emitToUser` quietly does nothing, and the website falls back to polling.
let io: Server | null = null;

const room = (userId: string) => `user:${userId}`;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
      credentials: true,
    },
  });

  // The website asks the API for a short-lived socket pass (it can't read its httpOnly
  // login cookie), then sends it here. Each user only ever joins their own room.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('missing token');
      socket.data.userId = verifySocketToken(token).userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(room(socket.data.userId as string));
  });

  return io;
};

export const emitToUser = (userId: string, event: string, payload: unknown) => {
  io?.to(room(userId)).emit(event, payload);
};
