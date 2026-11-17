# 0013. Events: on <event>[.modifiers][(param)]

- Status: accepted
- Date: 2026-11-17
- Question: Q11

## Decision
`on <event>[.modifier...][(param)]:` inside an element body attaches a DOM
listener. Modifiers: `prevent`, `stop`, `once` only. The parameter naming
the event object is optional. Components report events to parents via
callback props (e.g. `on_press=`); there is no custom event system in v1.

## Alternatives
- No modifiers; an implicit `event` name always in scope.

## Reason
Covers the common form/submit case in one line without hidden names.

## Consequences / known limitations
`on mount` / `on unmount` are lifecycle hooks (ADR 0014), so `mount` and
`unmount` cannot be used as DOM event names. Other modifiers (keys,
`passive`, `capture`) are deferred.
