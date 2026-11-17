# 0016. One default slot per component

- Status: accepted
- Date: 2026-11-17
- Question: Q14

## Decision
A `slot` line in a component's markup marks where the caller's child markup
is rendered. At most one `slot` per component in v1. Child markup is
compiled in the caller's scope (it sees the caller's state, not the
component's).

## Alternatives
- Named slots now (`slot header` plus `header:` blocks at the call site).

## Reason
Covers card, panel and layout use with minimal grammar.

## Consequences / known limitations
Named slots and fallback content are deferred. Children passed to a
component with no `slot` are a compile error.
