# 0004. Style blocks: declaration vs nested rule by line shape, then name

- Status: accepted
- Date: 2026-11-17
- Question: Q2

## Decision
Inside `style:` the lexer reads whole lines.
1. A line ending in `:` and followed by a deeper-indented block is a nested
   rule; its selector is everything before that final `:`. Any other line
   is a declaration: property = leading `[-a-zA-Z]+` or `--custom` up to the
   first `:`, value = the raw rest of the line.
2. A selector that is a bare known pseudo-class (`hover`, `focus`,
   `nth-child(2)`, ...) becomes `&:name`; a known pseudo-element (`before`,
   `after`, `placeholder`, ...) becomes `&::name`.
3. Anything else is a literal selector relative to the element (`a`,
   `.odd`, `&.done`, `> p`, `@media ...`). A quoted string may be used for
   awkward selectors.

## Alternatives
- Require CSS spelling (`&:hover:`).
- A prefix for pseudo-states (`@hover:`).

## Reason
Keeps the chosen `hover:` syntax, and `:` inside values or at-rules never
matters because declarations split at the first colon and rules are
recognised by the final colon plus an indented block.

## Consequences / known limitations
Relies on lookup tables of pseudo-classes and pseudo-elements. A typo such
as `hovr:` would become a descendant selector, so the compiler warns when a
bare selector is neither a known pseudo name nor a known HTML element.
