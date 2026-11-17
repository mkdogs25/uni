# 0021. Type hints allowed everywhere, Python-style

- Status: accepted
- Date: 2026-11-17
- Question: Q20

## Decision
`name: Type = value` on `state`, `derived`, plain variables, props and
`def` parameters; `-> Type` on `def` returns. Hints are parsed into the AST,
used by the checker (ADR 0020) and stripped from output.

## Alternatives
- Hints only on props and `def` signatures.

## Reason
Matches Python annotations and lets the checker see state types.

## Consequences / known limitations
`X | Y` in a hint uses `|`, which is why text uses quotes, not Pug's `|`
(ADR 0005).
