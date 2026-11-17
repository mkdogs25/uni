"""The compiler's public entry points, shared by the CLI and the browser IDE.

Every mode returns a plain dict that is JSON-serialisable:

    {"ok": bool,
     "output": <mode-specific>,      # tokens list, AST dict, or {filename: text}
     "diagnostics": [{"severity": "error" | "warning" | "info",
                      "file": str, "line": int, "col": int,
                      "message": str, "hint": str | None}]}

Modes that belong to a compiler phase not built yet return an "info"
diagnostic naming that phase, so the IDE can show what is coming.
"""

import json
import os
import shutil
import tempfile

# Mode -> the phase that implements it (docs/SPEC.md section 7).
MODES = {
    "tokens": 1,
    "ast": 2,
    "check": 6,  # 6b: type checker
    "build": 3,  # html from phase 3, css from 4, js from 5
}

# Highest phase whose tests pass. Bump this as each phase lands.
IMPLEMENTED_PHASE = 0


def _not_yet(mode, path):
    phase = MODES[mode]
    return {
        "ok": False,
        "output": None,
        "diagnostics": [
            {
                "severity": "info",
                "file": path,
                "line": 0,
                "col": 0,
                "message": f"'{mode}' arrives in phase {phase}; "
                f"the compiler is at phase {IMPLEMENTED_PHASE}.",
                "hint": "See docs/JOURNAL.md for progress.",
            }
        ],
    }


def run(mode, path):
    """Run one compiler mode on the file at `path`."""
    if mode not in MODES:
        raise ValueError(f"unknown mode {mode!r}; expected one of {sorted(MODES)}")
    if MODES[mode] > IMPLEMENTED_PHASE:
        return _not_yet(mode, path)
    raise NotImplementedError(mode)  # replaced phase by phase


def run_virtual(mode, files_json, entry):
    """Run a mode on in-memory files (used by the IDE).

    `files_json` is a JSON object {relative_path: source}; `entry` is one of
    its keys. Files are written to a temporary directory so imports resolve
    exactly as they do on disk. Returns the result as a JSON string.
    """
    files = json.loads(files_json)
    root = tempfile.mkdtemp(prefix="weft-")
    try:
        for rel, text in files.items():
            full = os.path.join(root, rel)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w", encoding="utf-8") as f:
                f.write(text)
        result = run(mode, os.path.join(root, entry))
        # Report paths relative to the virtual project, not the temp dir.
        for d in result["diagnostics"]:
            if d["file"].startswith(root):
                d["file"] = os.path.relpath(d["file"], root)
        return json.dumps(result)
    finally:
        shutil.rmtree(root, ignore_errors=True)
