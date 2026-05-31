import WebSocket from 'ws';
global.WebSocket = WebSocket;
import { createServer } from 'vite';
const server = await createServer({ server: { port: 3000 } });
await server.listen();
