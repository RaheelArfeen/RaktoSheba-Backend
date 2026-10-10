import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { createServer } from 'http';
import app from './app';
import { initSocket } from './app/realtime/socket';

const port = process.env.PORT || 8000;

// One HTTP server for both the REST API and the Socket.io connection.
const server = createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
