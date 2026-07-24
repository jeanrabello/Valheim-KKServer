"use strict";
// Restauração por linha de comando (sem interface). Usa a mesma lógica do painel.
try { require("dotenv").config(); } catch {}
const { restore } = require("./lib/tasks");

const log = (msg, level = "info") => {
  const tag = { ok: "[ok] ", warn: "[!] ", error: "[x] ", step: "> " }[level] || "    ";
  console.log(tag + msg);
};

restore(log)
  .then(() => process.exit(0))
  .catch((err) => { log(err.message, "error"); process.exit(1); });
