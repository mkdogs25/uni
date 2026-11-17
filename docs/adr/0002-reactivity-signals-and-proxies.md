# 0002. Reactivity via runtime signals and deep proxies

- Status: accepted
- Date: 2026-11-17
- Question: Q5

## Decision
Each `state` is a signal. Lists and dicts held in state are wrapped in a
Proxy so mutations (`todos.append(x)`, `todo.done = True`) notify. Every
dynamic DOM binding (text, attribute, class, style variable, `if`, `for`)
is a small effect that re-runs only when a signal it read changes. Updates
are batched in a microtask. `for` reconciles by `key` when given, else by
index; `if` swaps whole fragments.

## Alternatives
- Compile-time dependency analysis (Svelte 3 style).
- Re-render the component and morph the DOM.

## Reason
Works across closures, callbacks passed to child components, loop
variables and async code without the compiler tracking data flow, so no
`todos = todos` workarounds are needed.

## Consequences / known limitations
A generated runtime of roughly 200 lines is inlined in each page's JS.
Proxied objects look noisier in browser devtools.
