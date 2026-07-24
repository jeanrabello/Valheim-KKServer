"use strict";

/**
 * Lógica de backup e restauração.
 *
 * backup():  pasta local do Valheim  ->  ./worlds_local  ->  git push
 * restore(): git pull  ->  ./worlds_local  ->  pasta local do Valheim
 *
 * Ambas recebem um `log(mensagem, nivel)` para transmitir o progresso ao vivo
 * para a interface. `nivel` ∈ "info" | "ok" | "warn" | "error" | "step".
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { getConfig } = require("./config");
const { selectForCopy, listWorldFiles, humanSize } = require("./worldFiles");

/** Roda um comando e transmite stdout/stderr linha a linha via log(). */
function run(command, args, cwd, log) {
  return new Promise((resolve, reject) => {
    log(`$ ${command} ${args.join(" ")}`, "step");
    const child = spawn(command, args, { cwd, shell: process.platform === "win32" });
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString();
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop();
      for (const line of parts) if (line.trim()) log(line, "info");
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (buffer.trim()) log(buffer, "info");
      if (code === 0) resolve();
      else reject(new Error(`"${command} ${args.join(" ")}" terminou com código ${code}`));
    });
  });
}

function copyFiles(sourceDir, destDir, fileNames, log) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  let total = 0;
  for (const name of fileNames) {
    const from = path.join(sourceDir, name);
    const to = path.join(destDir, name);
    const size = (() => {
      try {
        return fs.statSync(from).size;
      } catch {
        return 0;
      }
    })();
    fs.copyFileSync(from, to);
    total += size;
    log(`copiado  ${name}  (${humanSize(size)})`, "ok");
  }
  return total;
}

function requireConfig(cfg, needsUser) {
  if (!cfg.worldName) {
    throw new Error(
      'WORLD_NAME não definido. Informe o nome do mundo na configuração antes de continuar.'
    );
  }
  if (needsUser && cfg.usingDefaultPath && !cfg.windowsUser) {
    throw new Error(
      'Sem usuário do Windows nem caminho manual: não sei onde estão os mundos locais do Valheim.'
    );
  }
}

/** Backup: mundo local -> repositório -> push. */
async function backup(log) {
  const cfg = getConfig();
  requireConfig(cfg, true);

  log(`Mundo: ${cfg.worldName}`, "info");
  log(`Origem (Valheim): ${cfg.sourcePath}`, "info");
  log(`Destino (repositório): ${cfg.repoWorldsPath}`, "info");

  if (!fs.existsSync(cfg.sourcePath)) {
    throw new Error(`Pasta de mundos do Valheim não encontrada: ${cfg.sourcePath}`);
  }

  const files = selectForCopy(cfg.sourcePath, cfg.worldName, cfg);
  if (files.length === 0) {
    throw new Error(
      `Nenhum arquivo do mundo "${cfg.worldName}" encontrado na pasta local do Valheim.`
    );
  }

  log("Sincronizando com o repositório remoto…", "step");
  await run("git", ["pull", "origin", "main"], cfg.repoRoot, log);

  log(`Copiando ${files.length} arquivo(s) do mundo…`, "step");
  const bytes = copyFiles(cfg.sourcePath, cfg.repoWorldsPath, files, log);

  log("Registrando alterações no Git…", "step");
  await run("git", ["add", "."], cfg.repoRoot, log);

  // Se não houve mudança, git commit falha; tratamos como "nada a fazer".
  const status = await gitPorcelain(cfg.repoRoot);
  if (!status) {
    log("Nada mudou desde o último backup — nada a enviar.", "warn");
    return { world: cfg.worldName, files: files.length, bytes, pushed: false };
  }

  const stamp = timestamp();
  const author = cfg.author || "Anônimo";
  const message = `${author} - Backup automático - ${stamp.date} - ${stamp.time}`;
  await run("git", ["commit", "-m", message], cfg.repoRoot, log);
  await run("git", ["push", "origin", "main"], cfg.repoRoot, log);

  log("Backup enviado com sucesso para o repositório remoto.", "ok");
  return { world: cfg.worldName, files: files.length, bytes, pushed: true };
}

/** Restauração: repositório -> mundo local. Sobrescreve os arquivos locais. */
async function restore(log) {
  const cfg = getConfig();
  requireConfig(cfg, true);

  log(`Mundo: ${cfg.worldName}`, "info");
  log(`Origem (repositório): ${cfg.repoWorldsPath}`, "info");
  log(`Destino (Valheim): ${cfg.sourcePath}`, "info");

  log("Baixando a versão mais recente do repositório…", "step");
  await run("git", ["pull", "origin", "main"], cfg.repoRoot, log);

  const files = selectForCopy(cfg.repoWorldsPath, cfg.worldName, cfg);
  if (files.length === 0) {
    throw new Error(
      `Nenhum arquivo do mundo "${cfg.worldName}" encontrado no repositório.`
    );
  }

  log(`Aplicando ${files.length} arquivo(s) na pasta local (isso sobrescreve o mundo atual)…`, "step");
  const bytes = copyFiles(cfg.repoWorldsPath, cfg.sourcePath, files, log);

  log("Mundo restaurado nos arquivos locais do Valheim.", "ok");
  return { world: cfg.worldName, files: files.length, bytes };
}

// --- utilidades ---

function gitPorcelain(cwd) {
  return new Promise((resolve) => {
    const child = spawn("git", ["status", "--porcelain"], {
      cwd,
      shell: process.platform === "win32",
    });
    let out = "";
    child.stdout.on("data", (c) => (out += c.toString()));
    child.on("close", () => resolve(out.trim()));
    child.on("error", () => resolve(""));
  });
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return {
    date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
  };
}

/** Inventário para a UI: o que existe no repo e no local. */
function inventory() {
  const cfg = getConfig();
  return {
    world: cfg.worldName,
    repo: listWorldFiles(cfg.repoWorldsPath, cfg.worldName).map(withHuman),
    local: listWorldFiles(cfg.sourcePath, cfg.worldName).map(withHuman),
  };
}
function withHuman(f) {
  return { ...f, human: humanSize(f.size) };
}

module.exports = { backup, restore, inventory };
