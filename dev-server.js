const { default: WebSocket } = require('ws');
global.WebSocket = WebSocket;
await import('vite');
const { createServer } = await import('vite');
const server = await createServer({ server: { port: 3000 } });
await server.listen();
