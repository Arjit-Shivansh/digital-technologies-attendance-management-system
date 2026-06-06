/**
 * Local dev: Vite on :3000 (frontend) + Vercel dev on :4000 (API).
 * Vite proxies /api → http://localhost:4000 (see vite.config.js).
 */
import { createRequire } from "module";
import { spawn } from "child_process";

createRequire(import.meta.url)("../ws-polyfill.cjs");

const isWin = process.platform === "win32";

function run(label, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWin,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[${label}] stopped (${signal})`);
      return;
    }
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });

  return child;
}

console.log("Starting local dev — app :3000, API :4000…\n");

const api = run("api", "npx", ["vercel", "dev", "--listen", "4000"]);
const web = run("web", "npx", ["vite", "--port", "3000", "--strictPort"]);

function shutdown() {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
