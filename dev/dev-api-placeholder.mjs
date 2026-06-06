/**
 * Minimal dev server for `vercel dev` (API on :4000).
 * Vercel requires the dev command to listen on process.env.PORT.
 * The real UI runs separately via Vite on :3000.
 */
import http from "http";

const port = Number(process.env.PORT) || 5173;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("API dev placeholder — use Vite on :3000; /api routes are served by Vercel.\n");
});

server.listen(port, () => {
  console.log(`API placeholder listening on port ${port} (Vercel dev exposes /api on :4000)`);
});
