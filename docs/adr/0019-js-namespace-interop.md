# 0019. JS interop through an explicit js namespace

- Status: accepted
- Date: 2026-11-17
- Question: Q18

## Decision
JS globals are reached through `js`: `js.Date.new()`, `js.console.log(x)`,
`js.document`. `.new(...)` constructs. The type checker treats `js.*` as
`any`. Unknown bare names are compile errors. Builtins: `len str int float
bool print range enumerate fetch_json every after cancel`. Lambdas are
expression-only; assignment needs a `def`.

## Alternatives
- Unknown names fall through to JS globals, plus a `new` keyword.

## Reason
Escape hatches stay visible and typos are caught at compile time.

## Consequences / known limitations
A JS method genuinely named `new` cannot be called. Example 07's `Clock`
lambda with assignment must become a `def`.
