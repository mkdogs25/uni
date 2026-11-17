// Runs the real Weft compiler (Python) inside Pyodide, off the UI thread.
// Protocol:
//   in : {id, mode, files: {path: source}, entry}
//   out: {type: "status", text} | {type: "ready", phase} |
//        {type: "result", id, mode, result} | {type: "fatal", text}

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;
let runVirtual = null;

async function init() {
  const status = (text) => postMessage({ type: "status", text });
  status("Loading Python (first visit downloads about 10 MB)…");
  py = await loadPyodide({ indexURL: PYODIDE });

  const manifest = await (await fetch("manifest.json", { cache: "no-cache" })).json();

  status("Installing lark…");
  // Wheels are shipped with the site (see ide/build_site.py), so no PyPI access.
  await py.loadPackage(manifest.wheels.map((w) => new URL(w, self.location.href).href));

  status("Loading the Weft compiler…");
  for (const rel of manifest.package_files) {
    const text = await (await fetch("weft/" + rel, { cache: "no-cache" })).text();
    const full = "/lib/weft/" + rel;
    py.FS.mkdirTree(full.slice(0, full.lastIndexOf("/")));
    py.FS.writeFile(full, text);
  }
  py.runPython("import sys; sys.path.insert(0, '/lib'); import lark");
  const api = py.pyimport("weft.api");
  runVirtual = api.run_virtual;
  postMessage({ type: "ready", phase: api.IMPLEMENTED_PHASE, modes: api.MODES.toJs({ dict_converter: Object.fromEntries }) });
}

const ready = init().catch((err) => {
  postMessage({ type: "fatal", text: String(err && err.message ? err.message : err) });
  throw err;
});

onmessage = async (event) => {
  const { id, mode, files, entry } = event.data;
  await ready;
  let result;
  try {
    result = JSON.parse(runVirtual(mode, JSON.stringify(files), entry));
  } catch (err) {
    // A Python exception escaping the API is a compiler bug: show it plainly.
    result = {
      ok: false,
      output: null,
      diagnostics: [{ severity: "error", file: entry, line: 0, col: 0,
        message: "Compiler crashed (this is a bug in Weft):\n" + String(err.message || err), hint: null }],
    };
  }
  postMessage({ type: "result", id, mode, result });
};
