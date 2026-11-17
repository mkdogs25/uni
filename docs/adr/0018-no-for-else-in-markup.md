# 0018. No special empty-list syntax

- Status: accepted
- Date: 2026-11-17
- Question: Q17

## Decision
Markup has no empty-list clause. Write `if not items:` beside the loop
(works because of Python truthiness, ADR 0017). `for ... else` in markup is
a compile error with a hint. In code, `for/else` is excluded in v1.

## Alternatives
- An `empty:` clause; reusing `else` (Jinja style).

## Reason
No new keyword and no conflict with Python's meaning of `for/else`.

## Consequences / known limitations
The list expression is written twice (loop and condition); use `derived`
for expensive ones.
