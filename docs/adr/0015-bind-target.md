# 0015. Two-way binding with bind=target

- Status: accepted
- Date: 2026-11-17
- Question: Q13

## Decision
`bind=target` on `input`, `select` and `textarea`. The property is inferred:
text-like inputs, `textarea` and `select` bind `value`; `checkbox` binds
`checked`; `number` and `range` bind a number (`valueAsNumber`). The target
must be an assignable path rooted at a state variable or a loop item
(`bind=draft`, `bind=todo.done`). Updates on the `input` event (`change` for
checkbox and select).

## Alternatives
- `bind:value=target` with an explicit property.

## Reason
Least typing for the overwhelmingly common cases.

## Consequences / known limitations
Radio groups and multi-select are deferred. Binding to a prop is an error
(props are read-only, ADR 0010).
