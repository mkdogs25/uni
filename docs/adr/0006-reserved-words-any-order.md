# 0006. Body constructs are reserved words, in any order

- Status: accepted
- Date: 2026-11-17
- Question: Q3

## Decision
In an element or component body, a line starting with `style`, `on`, `if`,
`elif`, `else`, `for` or `slot` is that construct; anything else is a tag,
component or text node. These may appear in any order.

## Alternatives
- Reserved words in a fixed order (style, on, children).
- Sigils (`@click:`, `%style:`).

## Reason
No extra punctuation; order carries no meaning, so enforcing one adds
friction without benefit. A formatter can normalise order later.

## Consequences / known limitations
No literal `<style>` element (use `style global:`, ADR 0011) and no tag
named `on`.
