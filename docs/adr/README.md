# Architecture Decision Records

One file per decision. Status is `accepted` unless marked otherwise.
Template: `0000-template.md`. Open questions: `../DESIGN-QUESTIONS.md`.

| ADR | Decision | Question |
|-----|----------|----------|
| [0001](0001-own-lexer-plus-lark-lalr.md) | Hand-written lexer + Lark LALR parser | Q0 |
| [0002](0002-reactivity-signals-and-proxies.md) | Runtime signals with deep proxies | Q5 |
| [0003](0003-output-static-html-plus-targeted-js.md) | Static HTML + targeted JS output | Q19 |
| [0004](0004-style-line-shape-then-name.md) | Style: line shape, then pseudo-class name | Q2 |
| [0005](0005-attributes-then-trailing-text.md) | Attributes name=value; one trailing text string | Q1 |
| [0006](0006-reserved-words-any-order.md) | Body constructs are reserved words, any order | Q3 |
| [0007](0007-hash-comments-need-space.md) | Comments: # followed by space or end of line | Q8 |
| [0008](0008-attribute-values-atoms.md) | Attribute values: atoms or (parenthesised) | Q9 |
| [0009](0009-strings-dedent-and-continuation.md) | Strings: closing-delimiter dedent; Python continuation | Q4 |
| [0010](0010-components-signature-dotted-imports.md) | Components: capitalised tags, signature props, dotted imports | Q6 |
| [0011](0011-scoping-class-per-element.md) | Scoped styles: generated class per element | Q7 |
| [0012](0012-page-block-entry.md) | Entry point: page block | Q10 |
| [0013](0013-events-modifiers-and-param.md) | Events: on event.modifiers(param) | Q11 |
| [0014](0014-derived-watch-lifecycle.md) | derived, watch, on mount/unmount | Q12 |
| [0015](0015-bind-target.md) | Two-way binding: bind=target | Q13 |
| [0016](0016-single-default-slot.md) | One default slot per component | Q14 |
| [0017](0017-logic-subset-semantics.md) | Logic subset: Python syntax, JS semantics, Python truthiness | Q16 |
| [0018](0018-no-for-else-in-markup.md) | No special empty-list syntax | Q17 |
| [0019](0019-js-namespace-interop.md) | JS interop via js namespace | Q18 |
