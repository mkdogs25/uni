# 0014. derived, watch and on mount/unmount keywords

- Status: accepted
- Date: 2026-11-17
- Question: Q12

## Decision
In a component or page declaration zone:
- `derived name = expr` is a cached computed signal, recomputed when what it
  reads changes, and read-only.
- `watch a, b:` runs its body when any listed name changes (not on first
  render). Names may be state, derived or props.
- `on mount:` runs after the component's DOM is inserted; `on unmount:` runs
  before removal. Bodies may `await`.

## Alternatives
- An auto-tracked `effect:` block.
- Decorators (`@derived def x():`).

## Reason
Explicit about what triggers each piece of code; reads like Python keywords.

## Consequences / known limitations
`watch` does not fire on initial render; put initial work in `on mount`.
