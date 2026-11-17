// Weft IDE: file list, editor, and output panes driven by the compiler worker.
// All compiler work goes through worker.js -> weft/api.py (ADR 0023).

(function () {
  "use strict";

  // ---------- storage (per-browser convenience only; may be unavailable) ----------
  const store = {
    get(key) { try { return localStorage.getItem("weft:" + key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem("weft:" + key, value); } catch { /* ignore */ } },
    del(key) { try { localStorage.removeItem("weft:" + key); } catch { /* ignore */ } },
  };

  // ---------- state ----------
  let originals = {};          // path -> source as shipped (examples)
  let files = {};              // path -> current source (with user edits)
  let current = null;          // open path
  let phase = 0;               // compiler's IMPLEMENTED_PHASE
  let ready = false;
  let requestId = 0;
  const latest = {};           // mode -> id of newest request (drop stale replies)
  let diagnostics = {};        // mode -> diagnostics list

  const $ = (id) => document.getElementById(id);
  const status = (text) => { $("status").textContent = text; };

  // ---------- editor ----------
  const editor = CodeMirror.fromTextArea($("editor"), {
    mode: "weft",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,  // tabs are an error in Weft (ADR 0009)
    extraKeys: {
      Tab: (cm) => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("    "),
      "Shift-Tab": (cm) => cm.indentSelection("subtract"),
      "Ctrl-Enter": () => compileNow(),
      "Cmd-Enter": () => compileNow(),
      "Ctrl-/": "toggleComment",
      "Cmd-/": "toggleComment",
    },
  });

  let debounce = null;
  editor.on("change", () => {
    if (!current) return;
    files[current] = editor.getValue();
    if (files[current] === originals[current]) store.del("file:" + current);
    else store.set("file:" + current, files[current]);
    renderFileList();
    if ($("auto").checked) {
      clearTimeout(debounce);
      debounce = setTimeout(compileNow, 400);
    }
  });

  // ---------- file list ----------
  function userFiles() {
    try { return JSON.parse(store.get("user-files") || "[]"); } catch { return []; }
  }

  function renderFileList() {
    const ul = $("file-list");
    ul.textContent = "";
    const paths = Object.keys(files).sort();
    const shownDirs = new Set();
    for (const path of paths) {
      const parts = path.split("/");
      for (let i = 1; i < parts.length; i++) {
        const dir = parts.slice(0, i).join("/");
        if (!shownDirs.has(dir)) {
          shownDirs.add(dir);
          const li = document.createElement("li");
          li.className = "dir";
          li.style.setProperty("--depth", i - 1);
          li.textContent = parts[i - 1] + "/";
          ul.appendChild(li);
        }
      }
      const li = document.createElement("li");
      li.style.setProperty("--depth", parts.length - 1);
      li.textContent = parts[parts.length - 1];
      li.title = path;
      if (originals[path] !== undefined && files[path] !== originals[path]) {
        const mark = document.createElement("span");
        mark.className = "edited";
        mark.textContent = " ●";
        mark.title = "Edited";
        li.appendChild(mark);
      }
      if (path === current) li.classList.add("active");
      li.addEventListener("click", () => openFile(path));
      ul.appendChild(li);
    }
  }

  function openFile(path) {
    current = path;
    store.set("current", path);
    $("file-name").textContent = path;
    editor.setValue(files[path]);
    editor.clearHistory();
    $("reset").disabled = originals[path] === undefined || files[path] === originals[path];
    renderFileList();
    compileNow();
  }

  $("reset").addEventListener("click", () => {
    if (originals[current] === undefined) return;
    if (!confirm("Discard your edits to " + current + "?")) return;
    store.del("file:" + current);
    files[current] = originals[current];
    openFile(current);
  });

  $("new-file").addEventListener("click", () => {
    let name = prompt("New file name (inside scratch/):", "my_page.weft");
    if (!name) return;
    name = name.replace(/^\/+/, "");
    if (!name.endsWith(".weft")) name += ".weft";
    const path = "scratch/" + name;
    if (files[path] === undefined) {
      files[path] = 'page "' + name.replace(/\.weft$/, "") + '":\n    h1 "Hello"\n';
      store.set("file:" + path, files[path]);
      const list = userFiles();
      list.push(path);
      store.set("user-files", JSON.stringify(list));
    }
    openFile(path);
  });

  // ---------- tabs ----------
  let activeTab = store.get("tab") || "preview";
  function showTab(name) {
    activeTab = name;
    store.set("tab", name);
    for (const b of $("tabs").querySelectorAll("button")) b.classList.toggle("active", b.dataset.tab === name);
    for (const p of document.querySelectorAll(".panel")) p.classList.toggle("active", p.id === "tab-" + name);
  }
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (b) showTab(b.dataset.tab);
  });

  // ---------- compiler worker ----------
  const worker = new Worker("worker.js");
  worker.onmessage = (event) => {
    const msg = event.data;
    if (msg.type === "status") status(msg.text);
    else if (msg.type === "fatal") status("Could not start the compiler: " + msg.text);
    else if (msg.type === "ready") {
      ready = true;
      phase = msg.phase;
      $("phase").textContent = "Compiler phase " + phase + " of 7";
      status("Ready");
      compileNow();
    } else if (msg.type === "result") {
      if (latest[msg.mode] !== msg.id) return;  // a newer request is in flight
      showResult(msg.mode, msg.result);
    }
  };

  const MODES = ["tokens", "ast", "build"];

  function compileNow() {
    if (!ready || !current) return;
    status("Compiling " + current + "…");
    for (const mode of MODES) {
      const id = ++requestId;
      latest[mode] = id;
      worker.postMessage({ id, mode, files, entry: current });
    }
  }
  $("run").addEventListener("click", compileNow);

  // ---------- results ----------
  function placeholder(el, text) {
    el.textContent = "";
    const div = document.createElement("div");
    div.className = "empty";
    div.textContent = text;
    el.appendChild(div);
  }

  function infoText(result) {
    const d = (result.diagnostics || []).find((x) => x.severity === "info");
    return d ? d.message : "No output (see Problems).";
  }

  function showResult(mode, result) {
    diagnostics[mode] = result.diagnostics || [];
    if (mode === "tokens") {
      if (result.ok) $("tab-tokens").textContent = formatTokens(result.output);
      else placeholder($("tab-tokens"), infoText(result));
    } else if (mode === "ast") {
      if (result.ok) $("tab-ast").textContent = JSON.stringify(result.output, null, 2);
      else placeholder($("tab-ast"), infoText(result));
    } else if (mode === "build") {
      const out = result.ok ? result.output || {} : {};
      for (const [tab, name] of [["html", "index.html"], ["css", "style.css"], ["js", "app.js"]]) {
        if (out[name] !== undefined) $("tab-" + tab).textContent = out[name];
        else placeholder($("tab-" + tab), result.ok ? name + " is produced in a later phase." : infoText(result));
      }
      renderPreview(out, result);
    }
    renderProblems();
    status("Ready");
  }

  function formatTokens(tokens) {
    // One token per line: "line:col  KIND  value"
    return tokens.map((t) => {
      const loc = (t.line + ":" + t.col).padEnd(8);
      const kind = String(t.type).padEnd(14);
      return loc + kind + (t.value === undefined || t.value === null ? "" : JSON.stringify(t.value));
    }).join("\n");
  }

  function renderPreview(out, result) {
    const frame = $("tab-preview");
    if (!out["index.html"]) {
      const msg = result.ok ? "Nothing to preview yet." : infoText(result);
      frame.srcdoc = '<!doctype html><body style="font:14px system-ui;color:#666;padding:16px">' +
        escapeHtml(msg) + "</body>";
      return;
    }
    // Inline style.css and app.js so the sandboxed iframe needs no network.
    let html = out["index.html"];
    const css = out["style.css"] || "";
    const js = out["app.js"] || "";
    html = html.replace(/<link rel="stylesheet" href="style\.css">/, () => "<style>\n" + css + "\n</style>");
    html = html.replace(/<script src="app\.js" defer><\/script>/, () =>
      "<script>document.addEventListener('DOMContentLoaded',()=>{\n" + js.replace(/<\/script/gi, "<\\/script") + "\n});</script>");
    frame.srcdoc = html;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  let marked = [];
  function renderProblems() {
    // Merge diagnostics from all modes, dropping duplicates and phase notices.
    const seen = new Set();
    const all = [];
    for (const mode of MODES) {
      for (const d of diagnostics[mode] || []) {
        const key = [d.severity, d.file, d.line, d.col, d.message].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(d);
      }
    }
    const real = all.filter((d) => d.severity !== "info");
    $("problem-count").textContent = real.length ? String(real.length) : "";

    for (const h of marked) editor.removeLineClass(h, "background");
    marked = [];
    const el = $("tab-problems");
    el.textContent = "";
    if (!all.length) { placeholder(el, "No problems."); return; }
    for (const d of all) {
      const row = document.createElement("div");
      row.className = "diag " + d.severity;
      const sev = document.createElement("span"); sev.className = "sev"; sev.textContent = d.severity;
      const loc = document.createElement("span"); loc.className = "loc";
      loc.textContent = d.line ? d.file + ":" + d.line + ":" + d.col : d.file;
      const msg = document.createElement("span"); msg.textContent = d.message;
      if (d.hint) { const h = document.createElement("span"); h.className = "hint"; h.textContent = "hint: " + d.hint; msg.appendChild(h); }
      row.append(sev, loc, msg);
      if (d.line && d.file === current) {
        const handle = editor.addLineClass(d.line - 1, "background", "line-" + d.severity);
        marked.push(handle);
        row.addEventListener("click", () => { editor.focus(); editor.setCursor({ line: d.line - 1, ch: Math.max(0, d.col - 1) }); });
      } else if (d.line && files[d.file] !== undefined) {
        row.addEventListener("click", () => { openFile(d.file); editor.setCursor({ line: d.line - 1, ch: Math.max(0, d.col - 1) }); });
      }
      el.appendChild(row);
    }
  }

  // ---------- start ----------
  async function start() {
    status("Loading examples…");
    try {
      originals = await (await fetch("examples.json", { cache: "no-cache" })).json();
    } catch {
      originals = { "scratch.weft": 'page "Scratch":\n    h1 "Hello"\n' };
    }
    files = {};
    for (const [path, text] of Object.entries(originals)) {
      files[path] = store.get("file:" + path) ?? text;
    }
    for (const path of userFiles()) {
      const text = store.get("file:" + path);
      if (text !== null) files[path] = text;
    }
    showTab(activeTab);
    const saved = store.get("current");
    openFile(files[saved] !== undefined ? saved : Object.keys(files).sort()[0]);
    if (!ready) status("Starting the compiler…");
  }
  start();
})();
