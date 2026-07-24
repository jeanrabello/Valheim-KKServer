"use strict";
// Backup por linha de comando (sem interface). Usa a mesma lógica do painel.
try { require("dotenv").config(); } catch {}
const { backup } = require("./lib/tasks");

const log = (msg, level = "info") => {
  const tag = { ok: "[ok] ", warn: "[!] ", error: "[x] ", step: "> " }[level] || "    ";
  console.log(tag + msg);
};

backup(log)
  .then(() => process.exit(0))
  .catch((err) => { log(err.message, "error"); process.exit(1); });
