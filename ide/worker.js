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

  status("Installing lark…");
  await py.loadPackage("micropip");
  await py.pyimport("micropip").install("lark");

  status("Loading the Weft compiler…");
  const list = await (await fetch("weft-files.json", { cache: "no-cache" })).json();
  for (const rel of list) {
    const text = await (await fetch("weft/" + rel, { cache: "no-cache" })).text();
    const full = "/lib/weft/" + rel;
    py.FS.mkdirTree(full.slice(0, full.lastIndexOf("/")));
    py.FS.writeFile(full, text);
  }
  py.runPython("import sys; sys.path.insert(0, '/lib')");
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
