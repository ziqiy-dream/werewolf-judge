/**
 * local server entry file, for local development
 */
import { Server } from 'socket.io';
import app from './app.js';
import { setupSocket } from './socket.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for local dev
    methods: ["GET", "POST"]
  }
});

setupSocket(io);

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
