# Journal

## 2026-11-16/17 — design phase
- Repo set up (`main` base commit; work on `claude/eager-curie-ev2grb`).
- Clarifying answers: one page per entry file, no router; Python-flavoured
  logic with JS semantics underneath; light type checking; v1 includes
  async/fetch, two-way binding, lifecycle/effects, slots.
- Drafted 10 example programs in `examples/` with `# Qn` markers.
- Wrote `docs/DESIGN-QUESTIONS.md` (Q0–Q21).
- Accepted ADRs 0001–0022 (all questions Q0–Q21). Name: Weft, `.weft`.
- Revised examples to match; wrote `docs/SPEC.md` draft (with proposals S1–S10 in §0).
- SPEC.md approved with S1–S10.

## 2026-11-17 — browser IDE (ADR 0023)
- `ide/`: static IDE (CodeMirror 5 + Weft highlighting, file list of the
  examples with per-browser edits, Preview/HTML/CSS/JS/Tokens/AST/Problems).
- A Web Worker runs the real `weft` package in Pyodide 0.26.4; `lark` ships
  as a wheel built by `ide/build_site.py`, so no PyPI access at runtime.
- `weft/api.py` is the only interface: `run(mode, path)` and
  `run_virtual(mode, files_json, entry)`, returning
  `{ok, output, diagnostics}`. Modes above `IMPLEMENTED_PHASE` return an
  info diagnostic. **Bump `IMPLEMENTED_PHASE` as each phase lands.**
- Output contract the IDE expects: `tokens` -> list of
  `{type, value, line, col}`; `ast` -> JSON object; `build` ->
  `{"index.html", "style.css", "app.js"}`.
- `.github/workflows/pages.yml` deploys from `main` to
  https://mkdogs25.github.io/uni. One-time setting needed: Pages source =
  GitHub Actions.
- `tests/ide/smoke.js` checks the IDE loads (desktop + phone width).
- Known limitation: the sandbox blocks cdnjs/jsDelivr, so the smoke test
  maps them to npm copies; highlighting is regex-based and approximate.
- Next: phase 1 (lexer) — implement `weft/lexer.py`, the `tokens` mode, unit
  tests and `tokens.json` goldens; set `IMPLEMENTED_PHASE = 1`.
