# 0010. Components: capitalised tags, signature props, dotted imports

- Status: accepted
- Date: 2026-11-17
- Question: Q6

## Decision
- A capitalised name in markup is a component; lowercase is an HTML element
  (hyphenated lowercase is a custom element).
- Props are declared in a Python-style signature:
  `component Card(title: str, accent: str = "steelblue"):`. Props are
  reactive and read-only inside the component (assignment is an error).
- Imports: `from .components.button import Button` resolves relative to the
  importing file to `./components/button.weft`. Every top-level name is
  exported; names starting with `_` are private. Imports are resolved at
  compile time into one bundle per page.

## Alternatives
- Path-string imports (`from "./components/button.weft" import Button`).
- `prop name: type` lines in the component body.

## Reason
Most Python-like; one line shows each prop's name, type and default.

## Consequences / known limitations
No absolute or package imports in v1, only relative ones. Example 08 must
switch from path strings to dotted imports.
