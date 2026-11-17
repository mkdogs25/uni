# 0008. Attribute values are atoms or parenthesised expressions

- Status: accepted
- Date: 2026-11-17
- Question: Q9

## Decision
- A value is a string (with `{}` interpolation), number, `True/False/None`,
  name, dotted name or call; any other expression goes in `( )`.
- `True` renders a bare boolean attribute; `False`/`None` omits it.
- `class:name=cond` toggles one class; `class=expr` (string or list) adds
  classes merged with the shorthand classes.
- `html=expr` sets raw inner HTML (the name makes the risk visible).
- Names in tag heads may contain `-` (`aria-label`, `data-id`, `todo-app`);
  tag heads are lexed in their own mode.

## Alternatives
- JSX braces (`disabled={not valid}`).

## Reason
Braces already mean interpolation in strings. Atoms keep tag lines readable
and make ADR 0005 unambiguous.

## Consequences / known limitations
`html=` performs no sanitising. `-` cannot be subtraction in an unparenthesised
tag-head value.
