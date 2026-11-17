# 0009. Strings: closing-delimiter dedent, Python line continuation

- Status: accepted
- Date: 2026-11-17
- Question: Q4

## Decision
- INDENT/DEDENT are suppressed inside `()[]{}` and inside strings.
- Indentation is spaces only, any consistent width; tabs are an error.
  Blank and comment-only lines do not affect indentation.
- Triple-quoted strings strip leading whitespace up to the column of the
  closing `"""` (Swift rule); a content line indented less than that is an
  error. The newline after the opening and before the closing delimiter is
  dropped.
- Line continuation: implicit inside brackets, explicit trailing `\`.
- `{expr}` interpolates; `{{` and `}}` are literal braces; `r"..."` disables
  interpolation and escapes. The lexer tracks bracket depth inside `{...}`,
  so quotes of either kind may appear inside an interpolation.
- Format specs (`{x:.1f}`) are deferred; use helper functions.
- Blocks are classified by context: a component or page body has a
  declaration zone (`state`, `derived`, `def`, `watch`, `on mount`, plain
  `name = value`) and markup. Inside markup every line is a node or markup
  keyword; inside `def` / `on` bodies every line is a statement. A statement
  in markup is a compile error with a hint.

## Alternatives
- `textwrap.dedent` (common prefix) with a format-spec subset.
- Pug-style continuation lines starting with `\`.

## Reason
The closing-delimiter rule shows the author exactly what is stripped, and
`pre` keeps relative indentation. Python's continuation rules are familiar.

## Consequences / known limitations
No format specs in v1. The leading-`\` continuation in example 10 must change.
