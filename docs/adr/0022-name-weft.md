# 0022. The language is called Weft

- Status: accepted
- Date: 2026-11-17
- Question: Q21

## Decision
Name: **Weft**. Source files use `.weft`. The CLI command is `weft`
(`weft tokens`, `weft ast`, `weft build`). The Python package is `weft`.

## Alternatives
- Strata (`.strata`), Tessera (`.tess`).

## Reason
Short, easy to type; the image of a thread woven through the warp fits a
language that weaves markup, style and logic into one file.

## Consequences / known limitations
Generated CSS classes and markers keep the short `t-` / `data-t` prefixes
from ADRs 0003 and 0011 (renaming them to `w-` is cheap if wanted).
