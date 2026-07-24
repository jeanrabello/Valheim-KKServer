"use strict";

/**
 * Servidor local do painel de backup do Valheim.
 *
 * Serve a interface (public/) e expõe uma API pequena:
 *   GET  /api/config          -> configuração atual
 *   POST /api/config          -> salva configuração no .env
 *   GET  /api/inventory       -> arquivos do mundo no repo e no local
 *   GET  /api/run?task=backup -> executa e transmite o log via Server-Sent Events
 *   GET  /api/run?task=restore-> idem para restauração
 *
 * Sem frameworks: apenas os módulos nativos do Node (+ dotenv, já usado no projeto).
 * Assim tudo cabe num único executável depois (pkg/nexe).
 */

try {
  require("dotenv").config();
} catch {
  /* dotenv é opcional em runtime empacotado */
}

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { getConfig, saveConfig } = require("./lib/config");
const tasks = require("./lib/tasks");

const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = getConfig().port;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Acesso negado");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Não encontrado");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleApi(req, res, url) {
  // --- configuração ---
  if (url.pathname === "/api/config" && req.method === "GET") {
    return sendJson(res, 200, getConfig());
  }
  if (url.pathname === "/api/config" && req.method === "POST") {
    try {
      const patch = JSON.parse((await readBody(req)) || "{}");
      const saved = saveConfig(patch);
      return sendJson(res, 200, saved);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // --- inventário ---
  if (url.pathname === "/api/inventory" && req.method === "GET") {
    try {
      return sendJson(res, 200, tasks.inventory());
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- execução com log ao vivo (SSE) ---
  if (url.pathname === "/api/run" && req.method === "GET") {
    const task = url.searchParams.get("task");
    if (task !== "backup" && task !== "restore") {
      return sendJson(res, 400, { error: "task inválida" });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const send = (event, payload) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    const log = (message, level = "info") => send("log", { message, level });

    const runner = task === "backup" ? tasks.backup : tasks.restore;
    runner(log)
      .then((summary) => send("done", { ok: true, summary }))
      .catch((err) => send("done", { ok: false, error: err.message }))
      .finally(() => res.end());
    return;
  }

  return sendJson(res, 404, { error: "rota não encontrada" });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch((err) => sendJson(res, 500, { error: err.message }));
  } else {
    serveStatic(req, res);
  }
});

function openBrowser(targetUrl) {
  const cmd =
    process.platform === "win32" ? "start" :
    process.platform === "darwin" ? "open" : "xdg-open";
  try {
    spawn(cmd, [targetUrl], { shell: true, stdio: "ignore", detached: true }).unref();
  } catch {
    /* se falhar, o usuário abre manualmente */
  }
}

server.listen(PORT, () => {
  const address = `http://localhost:${PORT}`;
  console.log("");
  console.log("  Painel de backup do Valheim rodando em " + address);
  console.log("  Feche esta janela para encerrar o painel.");
  console.log("");
  if (process.env.NO_OPEN !== "1") openBrowser(address);
});
