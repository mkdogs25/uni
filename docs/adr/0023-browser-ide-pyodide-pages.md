# 0023. Browser IDE on GitHub Pages, running the real compiler via Pyodide

- Status: accepted
- Date: 2026-11-17
- Question: user request (IDE at https://mkdogs25.github.io/uni)

## Decision
- A static IDE lives in `ide/` and is deployed to GitHub Pages by
  `.github/workflows/pages.yml` on every push to `main`.
- It runs the same `weft` Python package as the CLI inside Pyodide (loaded
  from the jsDelivr CDN in a Web Worker); `lark` is installed with micropip.
- The IDE talks to the compiler only through `weft/api.py`
  (`run_virtual(mode, files, entry)` returning JSON), so each compiler phase
  lights up an IDE pane without IDE changes.
- Editor: CodeMirror 5 with a small Weft highlighting mode (hackable, no
  build step).

## Alternatives
- Editor only, no in-browser compiling.
- A second compiler written in JavaScript (contradicts ADR 0001).

## Reason
One source of truth: the IDE's tokens, AST and output match the CLI exactly.

## Consequences / known limitations
First load downloads Pyodide (~10 MB, then cached) and needs network access
to the CDN and PyPI. Highlighting is regex-based and approximate; the
compiler's own diagnostics are authoritative. The Pages source must be set
to "GitHub Actions" once, by hand, in the repository settings.
