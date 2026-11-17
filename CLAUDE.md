# CLAUDE.md

Weft (`.weft`, ADR 0022), a personal language: one
indentation-based, Python-like file combining markup, styling and logic,
compiled by a Python compiler to HTML, CSS and JS.

## Where things are
- Accepted decisions: `docs/adr/README.md` (index). Read before changing
  syntax, semantics, output format or architecture.
- Design questions (all decided, historical): `docs/DESIGN-QUESTIONS.md`.
- Spec: `docs/SPEC.md` (approved 2026-11-17).
- Progress journal: `docs/JOURNAL.md` — read first when resuming; update at
  the end of every work session (done, decisions, next step).
- Example programs (also golden-test inputs): `examples/`.
- Browser IDE: `ide/` (ADR 0023). It only calls `weft/api.py`; keep that
  API's output contract stable and bump `IMPLEMENTED_PHASE` per phase.

## Rules
- **If a request conflicts with an accepted ADR, stop and ask** before doing
  anything. Never change an accepted decision silently; propose a new ADR
  that supersedes it.
- Do not decide open design questions silently: present 2–3 options with a
  recommendation and let the user choose. Record each choice as an ADR.
- Build in stage-gated phases (lexer, parser, HTML, CSS, logic/JS,
  components/imports, CLI polish). A phase is done only when its tests and
  all earlier phases' tests pass. Commit after each passing phase.
- Ask the user to review the first instance of any new pattern (new AST
  node, new codegen rule) before repeating it.
- Prefer small, readable code over cleverness. Call out hacks and known
  limitations explicitly.
- Where indentation, strings, style values or markup could be ambiguous,
  point it out and propose a rule instead of guessing.
- Write in British English.

## Tests (once they exist)
- Golden tests: each example compiles to expected HTML/CSS/JS under
  `tests/golden/`. Tests also run the real CLI (`tokens`, `ast`, `build`).
- A meta-test deliberately breaks the compiler and checks the suite fails.
