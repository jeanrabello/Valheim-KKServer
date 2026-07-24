"use strict";

/**
 * Leitura e escrita da configuração do backup.
 *
 * A configuração vive num arquivo .env na raiz do repositório (o mesmo lugar
 * onde fica a pasta worlds_local e o .git). As variáveis são:
 *
 *   WORLD_NAME            -> nome do mundo do Valheim a incluir no backup (ex.: KKEnterprise)
 *   WINDOWS_USER          -> usuário do Windows, usado para montar o caminho padrão dos mundos
 *   AUTHOR                -> nome que assina o commit
 *   VALHEIM_WORLDS_PATH   -> (opcional) caminho completo da pasta worlds_local do Valheim,
 *                            usado quando o caminho padrão não serve
 *   INCLUDE_AUTO_BACKUPS  -> "true"/"false": incluir os backups automáticos do Valheim
 *   INCLUDE_TEX_CACHE     -> "true"/"false": incluir os caches de mapa/altura/floresta
 *   PORT                  -> porta do servidor local (padrão 4173)
 *
 * Compatibilidade: o projeto antigo usava USER em vez de WINDOWS_USER. Ainda
 * aceitamos USER como valor de reserva para não quebrar .env existentes.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const REPO_ROOT = process.cwd();
const ENV_PATH = path.join(REPO_ROOT, ".env");
const REPO_WORLDS_PATH = path.join(REPO_ROOT, "worlds_local");

// --- parsing / serialização simples de .env (sem depender de libs externas) ---

function parseEnvFile(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readRawEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return parseEnvFile(fs.readFileSync(ENV_PATH, "utf8"));
}

function boolFrom(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function defaultSourcePath(windowsUser) {
  // Caminho padrão dos mundos locais do Valheim no Windows.
  if (windowsUser) {
    return `C:\\Users\\${windowsUser}\\AppData\\LocalLow\\IronGate\\Valheim\\worlds_local`;
  }
  // Em outros sistemas (ou sem usuário definido) devolvemos algo previsível
  // só para não quebrar; na prática o backup roda no Windows.
  return path.join(os.homedir(), "AppData", "LocalLow", "IronGate", "Valheim", "worlds_local");
}

function getConfig() {
  const env = readRawEnv();

  const worldName = env.WORLD_NAME || "";
  const windowsUser = env.WINDOWS_USER || env.USER || "";
  const author = env.AUTHOR || "";
  const sourcePath = env.VALHEIM_WORLDS_PATH || defaultSourcePath(windowsUser);

  return {
    worldName,
    windowsUser,
    author,
    sourcePath,
    repoWorldsPath: REPO_WORLDS_PATH,
    repoRoot: REPO_ROOT,
    includeAutoBackups: boolFrom(env.INCLUDE_AUTO_BACKUPS, false),
    includeTexCache: boolFrom(env.INCLUDE_TEX_CACHE, false),
    port: Number(env.PORT || process.env.PORT || 4173),
    // usa o caminho padrão? (informação útil pra UI)
    usingDefaultPath: !env.VALHEIM_WORLDS_PATH,
  };
}

// Chaves que a UI pode gravar, na ordem em que aparecem no arquivo.
const WRITABLE_KEYS = [
  "WORLD_NAME",
  "WINDOWS_USER",
  "AUTHOR",
  "VALHEIM_WORLDS_PATH",
  "INCLUDE_AUTO_BACKUPS",
  "INCLUDE_TEX_CACHE",
  "PORT",
];

function saveConfig(patch) {
  const current = readRawEnv();

  // migra USER antigo para WINDOWS_USER se necessário
  if (current.USER && !current.WINDOWS_USER) {
    current.WINDOWS_USER = current.USER;
    delete current.USER;
  }

  const mapping = {
    worldName: "WORLD_NAME",
    windowsUser: "WINDOWS_USER",
    author: "AUTHOR",
    sourcePathOverride: "VALHEIM_WORLDS_PATH",
    includeAutoBackups: "INCLUDE_AUTO_BACKUPS",
    includeTexCache: "INCLUDE_TEX_CACHE",
    port: "PORT",
  };

  for (const [field, envKey] of Object.entries(mapping)) {
    if (!(field in patch)) continue;
    let value = patch[field];
    if (typeof value === "boolean") value = value ? "true" : "false";
    if (value === null || value === undefined || value === "") {
      delete current[envKey];
    } else {
      current[envKey] = String(value).trim();
    }
  }

  // Serializa mantendo comentário de cabeçalho e ordem estável
  const lines = [];
  lines.push("# Configuração do backup do mundo Valheim");
  lines.push("# Gerado/atualizado pela interface local. Edite pela tela quando possível.");
  lines.push("");
  for (const key of WRITABLE_KEYS) {
    if (current[key] !== undefined && current[key] !== "") {
      lines.push(`${key}=${current[key]}`);
    }
  }
  // preserva quaisquer chaves extras que já existissem
  for (const [key, value] of Object.entries(current)) {
    if (!WRITABLE_KEYS.includes(key) && value !== undefined && value !== "") {
      lines.push(`${key}=${value}`);
    }
  }
  lines.push("");

  fs.writeFileSync(ENV_PATH, lines.join("\n"), "utf8");
  return getConfig();
}

module.exports = { getConfig, saveConfig, REPO_ROOT, REPO_WORLDS_PATH, ENV_PATH };
