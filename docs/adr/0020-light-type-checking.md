# 0020. Light type checking: cheap, useful checks as warnings

- Status: accepted
- Date: 2026-11-17
- Question: Q15

## Decision
A checker pass after parsing checks:
- literal values against hints on `state`, `derived`, plain variables and
  prop defaults;
- component call sites: unknown props, missing required props, literal
  values that do not match a prop's hint;
- arity of calls to `def`s and components defined or imported in the file.
Types: `str int float bool None any list list[T] dict dict[K, V] X | Y` and
component names. Unhinted means `any`; `js.*` is `any`. Findings are
warnings; `--strict` makes them errors. No inference through expressions.

## Alternatives
- Local inference through expressions.
- Call-site checks only.

## Reason
Catches the common mistakes (wrong or missing props, wrong literal) without
turning the project into a type-system project.

## Consequences / known limitations
`count = "a"` where `count: int` is caught only when the right side is a
literal. Implemented as phase 6b, after components and imports.
