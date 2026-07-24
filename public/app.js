"use strict";

const $ = (id) => document.getElementById(id);

const els = {
  worldName: $("worldName"),
  windowsUser: $("windowsUser"),
  author: $("author"),
  sourcePath: $("sourcePath"),
  pathHint: $("pathHint"),
  includeAutoBackups: $("includeAutoBackups"),
  includeTexCache: $("includeTexCache"),
  saveConfig: $("saveConfig"),
  saveNote: $("saveNote"),
  toggleConfig: $("toggleConfig"),
  configBody: $("configBody"),
  worldTagName: $("worldTagName"),
  btnBackup: $("btnBackup"),
  btnRestore: $("btnRestore"),
  log: $("log"),
  logEmpty: $("logEmpty"),
  consoleStatus: $("consoleStatus"),
  refreshInventory: $("refreshInventory"),
  repoList: $("repoList"),
  localList: $("localList"),
  repoCount: $("repoCount"),
  localCount: $("localCount"),
  scrim: $("scrim"),
  dlgWorld: $("dlgWorld"),
  dlgCancel: $("dlgCancel"),
  dlgConfirm: $("dlgConfirm"),
};

let running = false;

// --- configuração --------------------------------------------------------

async function loadConfig() {
  const cfg = await fetch("/api/config").then((r) => r.json());
  els.worldName.value = cfg.worldName || "";
  els.windowsUser.value = cfg.windowsUser || "";
  els.author.value = cfg.author || "";
  els.sourcePath.value = cfg.usingDefaultPath ? "" : cfg.sourcePath || "";
  els.includeAutoBackups.checked = !!cfg.includeAutoBackups;
  els.includeTexCache.checked = !!cfg.includeTexCache;
  els.pathHint.textContent = cfg.usingDefaultPath
    ? `Caminho padrão em uso: ${cfg.sourcePath}`
    : "Caminho manual definido.";
  updateWorldTag(cfg.worldName);
}

function updateWorldTag(name) {
  els.worldTagName.textContent = name && name.trim() ? name : "—";
}

async function saveConfig() {
  els.saveNote.className = "save-note";
  els.saveNote.textContent = "salvando…";
  const patch = {
    worldName: els.worldName.value.trim(),
    windowsUser: els.windowsUser.value.trim(),
    author: els.author.value.trim(),
    sourcePathOverride: els.sourcePath.value.trim(),
    includeAutoBackups: els.includeAutoBackups.checked,
    includeTexCache: els.includeTexCache.checked,
  };
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error((await res.json()).error || "falha ao salvar");
    const cfg = await res.json();
    updateWorldTag(cfg.worldName);
    els.pathHint.textContent = cfg.usingDefaultPath
      ? `Caminho padrão em uso: ${cfg.sourcePath}`
      : "Caminho manual definido.";
    els.saveNote.textContent = "configuração salva";
    loadInventory();
  } catch (err) {
    els.saveNote.className = "save-note err";
    els.saveNote.textContent = err.message;
  }
  setTimeout(() => (els.saveNote.textContent = ""), 3500);
}

// --- log / execução ------------------------------------------------------

function clearLog() {
  els.log.innerHTML = "";
}

function appendLog(message, level) {
  if (els.logEmpty && els.logEmpty.parentNode) els.logEmpty.remove();
  const line = document.createElement("div");
  line.className = `line ${level || "info"}`;
  const tick = document.createElement("span");
  tick.className = "tick";
  const t = new Date();
  const p = (n) => String(n).padStart(2, "0");
  tick.textContent = `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
  const msg = document.createElement("span");
  msg.className = "msg";
  msg.textContent = message;
  line.append(tick, msg);
  els.log.appendChild(line);
  els.log.scrollTop = els.log.scrollHeight;
}

function setStatus(text, kind) {
  els.consoleStatus.textContent = text;
  els.consoleStatus.className = "console-status" + (kind ? " " + kind : "");
}

function setRunning(state) {
  running = state;
  els.btnBackup.disabled = state;
  els.btnRestore.disabled = state;
}

function runTask(task) {
  if (running) return;
  setRunning(true);
  clearLog();
  setStatus(task === "backup" ? "executando backup…" : "restaurando…", "running");

  const source = new EventSource(`/api/run?task=${task}`);

  source.addEventListener("log", (ev) => {
    const { message, level } = JSON.parse(ev.data);
    appendLog(message, level);
  });

  source.addEventListener("done", (ev) => {
    const data = JSON.parse(ev.data);
    if (data.ok) {
      const s = data.summary || {};
      const verb = task === "backup" ? "Backup concluído" : "Restauração concluída";
      const extra =
        task === "backup" && s.pushed === false
          ? " — nada novo para enviar."
          : s.files
          ? ` — ${s.files} arquivo(s).`
          : ".";
      appendLog(verb + extra, "ok");
      setStatus("concluído", "ok");
    } else {
      appendLog("Erro: " + data.error, "error");
      setStatus("erro", "error");
    }
    source.close();
    setRunning(false);
    loadInventory();
  });

  source.onerror = () => {
    appendLog("Conexão com o painel interrompida.", "error");
    setStatus("erro", "error");
    source.close();
    setRunning(false);
  };
}

// --- inventário ----------------------------------------------------------

function renderList(ul, countEl, files) {
  ul.innerHTML = "";
  countEl.textContent = files.length ? `${files.length} arq.` : "vazio";
  if (!files.length) {
    const li = document.createElement("li");
    li.className = "inv-empty";
    li.textContent = "nenhum arquivo encontrado";
    ul.appendChild(li);
    return;
  }
  for (const f of files) {
    const li = document.createElement("li");
    li.className = "kind-" + f.kind;
    const name = document.createElement("span");
    name.className = "fname";
    name.textContent = f.name;
    name.title = f.name;
    const size = document.createElement("span");
    size.className = "fsize";
    size.textContent = f.human;
    li.append(name, size);
    ul.appendChild(li);
  }
}

async function loadInventory() {
  try {
    const inv = await fetch("/api/inventory").then((r) => r.json());
    renderList(els.repoList, els.repoCount, inv.repo || []);
    renderList(els.localList, els.localCount, inv.local || []);
  } catch {
    els.repoCount.textContent = "—";
    els.localCount.textContent = "—";
  }
}

// --- confirmação de restauração ------------------------------------------

function askRestore() {
  els.dlgWorld.textContent = els.worldName.value.trim() || "—";
  els.scrim.hidden = false;
}
function closeDialog() {
  els.scrim.hidden = true;
}

// --- ligações ------------------------------------------------------------

els.saveConfig.addEventListener("click", saveConfig);
els.worldName.addEventListener("input", () => updateWorldTag(els.worldName.value.trim()));
els.btnBackup.addEventListener("click", () => runTask("backup"));
els.btnRestore.addEventListener("click", askRestore);
els.dlgCancel.addEventListener("click", closeDialog);
els.dlgConfirm.addEventListener("click", () => {
  closeDialog();
  runTask("restore");
});
els.scrim.addEventListener("click", (e) => {
  if (e.target === els.scrim) closeDialog();
});
els.refreshInventory.addEventListener("click", loadInventory);
els.toggleConfig.addEventListener("click", () => {
  const hidden = els.configBody.hasAttribute("hidden");
  if (hidden) {
    els.configBody.removeAttribute("hidden");
    els.toggleConfig.textContent = "recolher";
    els.toggleConfig.setAttribute("aria-expanded", "true");
  } else {
    els.configBody.setAttribute("hidden", "");
    els.toggleConfig.textContent = "expandir";
    els.toggleConfig.setAttribute("aria-expanded", "false");
  }
});

// início
loadConfig();
loadInventory();
