# 0011. Scoped styles via a generated class per element

- Status: accepted
- Date: 2026-11-17
- Question: Q7

## Decision
- Each element with a `style:` block gets a generated class `t-<hash>`
  (hash of file path + element path in the tree). Nested rules become
  selectors rooted at it (`.t-3fa9c1:hover`, `.t-3fa9c1 a`,
  `@media ... { .t-3fa9c1 {...} }`). The compiler flattens nesting.
- `style global:` is allowed only at file top level and is emitted as plain
  CSS using the same nested syntax, flattened.
- Dynamic values (`color: {accent}`) compile to `var(--t-3fa9c1-0)`; JS sets
  the custom property on the element reactively.

## Alternatives
- A per-component attribute (`[data-t-ab12]`, Vue style).
- Native `@scope` / CSS nesting output.

## Reason
Matches "scoped to the element it is nested in" literally, gives low and
predictable specificity, and needs no modern CSS features.

## Consequences / known limitations
Descendant rules (`a:`) also reach into child components rendered inside
the element. Example 04's `style global` must move to the top level.
