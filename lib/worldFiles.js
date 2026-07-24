"use strict";

/**
 * Decide quais arquivos pertencem a um mundo e como classificá-los.
 *
 * Um mundo "KKEnterprise" no Valheim gera arquivos como:
 *   KKEnterprise.db / KKEnterprise.fwl            -> estado atual (essencial)
 *   KKEnterprise.db.old / KKEnterprise.fwl.old    -> cópia de segurança do jogo
 *   KKEnterprise_backup_auto-AAAAMMDD...db/.fwl   -> backups automáticos do jogo
 *   KKEnterprise_mapTexCache / _heightTexCache /
 *   _forestMaskTexCache                           -> cache de renderização do mapa
 *
 * O filtro é baseado no WORLD_NAME. Substitui o antigo `item.includes("tonidigo")`,
 * que era fixo no código.
 */

const fs = require("fs");
const path = require("path");

/** Um arquivo pertence ao mundo se for exatamente o nome ou começar com
 *  "<mundo>." (extensões) ou "<mundo>_" (backups/caches). Evita casar
 *  prefixos parecidos por acidente (ex.: "KK" x "KKEnterprise"). */
function belongsToWorld(fileName, worldName) {
  if (!worldName) return false;
  return (
    fileName === worldName ||
    fileName.startsWith(`${worldName}.`) ||
    fileName.startsWith(`${worldName}_`)
  );
}

const AUTO_BACKUP_RE = /_backup_auto-/i;
const TEX_CACHE_RE = /_(map|height|forestMask)TexCache$/i;

function classify(fileName) {
  if (TEX_CACHE_RE.test(fileName)) return "texCache";
  if (AUTO_BACKUP_RE.test(fileName)) return "autoBackup";
  return "core"; // .db, .fwl e seus .old
}

/**
 * Lista os arquivos de um mundo dentro de um diretório, já classificados e com tamanho.
 * Retorna [] se o diretório não existir.
 */
function listWorldFiles(dir, worldName) {
  if (!worldName || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => {
      const full = path.join(dir, name);
      try {
        return fs.lstatSync(full).isFile() && belongsToWorld(name, worldName);
      } catch {
        return false;
      }
    })
    .map((name) => {
      let size = 0;
      try {
        size = fs.statSync(path.join(dir, name)).size;
      } catch {}
      return { name, size, kind: classify(name) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Aplica as opções (incluir backups automáticos / caches) e devolve só os
 * nomes de arquivo que devem ser copiados.
 */
function selectForCopy(dir, worldName, { includeAutoBackups, includeTexCache }) {
  return listWorldFiles(dir, worldName)
    .filter((f) => {
      if (f.kind === "autoBackup") return !!includeAutoBackups;
      if (f.kind === "texCache") return !!includeTexCache;
      return true; // core sempre entra
    })
    .map((f) => f.name);
}

function humanSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

module.exports = {
  belongsToWorld,
  classify,
  listWorldFiles,
  selectForCopy,
  humanSize,
};
