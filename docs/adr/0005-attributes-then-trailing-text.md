# 0005. Attributes are name=value; text is one trailing string

- Status: accepted
- Date: 2026-11-17
- Question: Q1

## Decision
After the tag shorthand (`tag.class#id`), each item is `name=value` or a
bare string. At most one bare string, and it must be last. `name=` is
recognised lexically (a name immediately followed by `=`).

## Alternatives
- Pug-style separator with unquoted text (`a href="/" | Home`).
- Text only as a child line.

## Reason
Unambiguous with no lookahead and keeps one-line links and buttons.

## Consequences / known limitations
Depends on ADR 0008: values must be atoms, so `href=x "Home"` is two items.
A second bare string on a tag line is a compile error.
