# Open design questions

Each question has 2–3 options, a recommendation (★) and trade-offs.
Nothing here is decided until you choose; each choice becomes an ADR in
`docs/adr/`. The `# Qn` markers in `examples/` point at the code each
question affects.

All questions below are now decided; see `adr/README.md`. (Written when the extension was the placeholder `.tbd`; the name is now Weft.)

---

## Q0. Parser architecture (challenging "use Lark")

The hard parts of this language are lexical: indentation, tag heads where
`-` is part of a name, raw CSS values, and `{expr}` inside strings.

- **A ★ Hand-written lexer + Lark LALR parser.** A ~300-line Python lexer
  with explicit modes (code / tag head / style / string) emits tokens with
  INDENT/DEDENT; Lark parses the token stream via its custom-lexer hook.
  *For:* the ambiguous bits are plain readable Python with precise error
  messages; the grammar stays a readable `.lark` file; `tokens` mode falls
  out naturally. *Against:* two mechanisms to learn.
- **B Lark for everything** (Lark's `Indenter` + contextual lexer).
  *For:* one tool. *Against:* mode switching (style values, tag heads,
  interpolation) fights Lark's lexer; errors are harder to make friendly.
- **C Hand-written recursive descent for everything.** *For:* full control,
  best errors. *Against:* no grammar file to read; more code to maintain.

## Q1. Attributes versus trailing text — `a.link href="/home" "Home"`

- **A ★ Positional.** After the tag shorthand, each item is either
  `name=value` or a bare string. At most one bare string, and it must be
  last. `name=` is recognised lexically (NAME immediately followed by `=`),
  so there is no lookahead problem. Requires attribute values to be atoms
  (see Q9) so `href=x "Home"` cannot be read as one expression.
- **B Separator.** `a href="/home" | Home` (Pug). Unquoted text is nicer to
  type, but `|` collides with the `X | Y` type-hint and bitwise operator, and
  interpolation inside unquoted text is murkier.
- **C Text only as a child line.** No ambiguity at all, but doubles line count
  for every link and button.

## Q2. CSS property versus nested block inside `style:`

Inside `style:` the lexer switches to *style mode* and reads whole lines.

- **A ★ Decide by line shape, then by name.**
  1. A line whose text ends with `:` and is followed by a deeper-indented
     block is a **nested rule**; the selector is everything before that
     final `:`. Otherwise it is a **declaration**: the property is the
     leading `[-a-zA-Z]+` (or `--custom`) up to the first `:`; the value is
     the raw rest of the line. So `:` inside values (`url("data:…")`,
     `@media (max-width: 600px):`) is never an issue.
  2. A nested-rule selector that is a bare name in a known pseudo-class list
     (`hover`, `focus`, `focus-within`, `active`, `first-child`,
     `nth-child(…)`, …) becomes `&:hover`. Names in the pseudo-element list
     (`before`, `after`, `placeholder`) become `&::before`.
  3. Anything else is a literal CSS selector relative to the element: `a`,
     `.odd`, `&.done`, `> p`, `@media …`. A string `"…"` is allowed for
     anything awkward.
  *Against:* the pseudo-class list is a lookup table (a known limitation;
  unknown names fall through as element selectors, e.g. a typo `hovr:`
  silently becomes a descendant selector — I'd warn on unknown HTML element
  names).
- **B Require CSS spelling:** `&:hover:` / `:hover:`. Zero tables, but the
  double colon is ugly and breaks your chosen example.
- **C Prefix pseudo-states:** `on hover:` or `@hover:`. Clear, but `on` is
  already events and `@` is at-rules.

## Q3. Telling `style:` and `on click:` from child tags; ordering

- **A ★ Reserved words, any order.** Inside an element body, a line starting
  with `style`, `on`, `if`, `elif`, `else`, `for`, `slot` is that construct;
  anything else is a tag/component/text. Order is free (semantics don't
  depend on it). Cost: you cannot write a literal `<style>` element or a tag
  named `on` (use `style global`, Q7).
- **B Reserved words, fixed order** (`style`, then `on …`, then children).
  More uniform files, compiler reports out-of-order; slightly more friction
  when hacking.
- **C Sigils:** `@click:`, `%style:`. Unambiguous without reserved words,
  but adds the punctuation you want to avoid.

## Q4. Strings, multi-line text, indentation and mixed blocks

Lexer rules I propose regardless of the options below: INDENT/DEDENT are
suppressed inside `()[]{}` (Python's implicit line joining) and inside
strings; tabs are an error (spaces only, any consistent width); blank and
comment-only lines don't affect indentation.

a) **Triple-quoted strings' indentation**
   - **A ★ Strip to the closing `"""`'s column** (Swift). Author sees exactly
     what is stripped; `pre` content keeps relative indentation.
   - **B Strip the common prefix** (`textwrap.dedent`). Familiar to Python
     users, but one under-indented line changes the whole block.
   - **C No stripping.** Simple, nearly always wrong in HTML.

b) **Line continuation**
   - **A ★ Python rules:** implicit inside brackets, explicit trailing `\`.
     (Example 10's leading-`\` style would be dropped.)
   - **B Deeper-indented line starting with `\`** (Pug-like).

c) **Literal braces and format specs:** `{{`/`}}` escape (like f-strings);
   `r"…"` disables interpolation; the lexer tracks bracket depth inside
   `{…}` so quotes inside are fine. Format specs `{x:.1f}`:
   - **A ★ Defer;** use functions (`fixed(x, 1)`). Keeps `:` meaning simple.
   - **B Support a small subset** (`.Nf`, `,`, `>N`) via a runtime helper.

d) **Mixed blocks.** Classification is by *context*: a component body has a
   *declaration zone* (`state`, `derived`, `def`, `watch`, `on mount`, plain
   `name = value`) and *markup*; inside markup every line is a node or a
   markup keyword (Q3); inside `def` / `on …:` bodies every line is a
   statement. So `if` means markup-if in markup and statement-if in code.
   - **A ★ Context-sensitive as described;** a stray statement in markup
     (`x = 1`) is a compile error with a hint.
   - **B Allow statements in markup** (run once at render). Flexible, but
     blurs when code runs — a common source of bugs.

## Q5. Reactivity model and DOM updates

- **A ★ Runtime signals with deep proxies** (Solid/Vue style). Each `state`
  is a signal; lists/dicts are wrapped in a Proxy so `todos.append(x)` and
  `todo.done = True` notify. Every dynamic text node, attribute, class,
  style variable, `if` and `for` is a tiny effect that re-runs only when
  something it *read* changes; updates batch in a microtask. Works across
  closures, callbacks passed to children and async code without the compiler
  knowing data flow. Runtime ≈ 200 lines, generated into the output.
  *Against:* Proxies make debugging objects in devtools slightly noisier.
- **B Compile-time dependency analysis** (Svelte 3 style). Smallest output;
  but the compiler must see every write. Mutations through a loop variable
  (`bind=todo.done`), lambdas passed as props, or helper functions are
  missed or need `todos = todos` workarounds — exactly the kind of awkwardness
  you want to avoid.
- **C Re-render component and morph the DOM.** Tiny compiler, but needs a
  diffing runtime, loses input focus/caret unless careful, and is slow on
  big lists.

`for` loops: keyed reconciliation when `key expr` is given, otherwise by
index. `if` swaps whole fragments.

## Q6. Components, props and imports

a) **Components as tags:** **A ★ Capitalised name = component**, lowercase =
   HTML element (hyphenated lowercase = custom element). **B** explicit
   registration. A is the React/Mint rule and needs no lookup.

b) **Declaring props:**
   - **A ★ Python signature:** `component Card(title: str, accent = "x"):` —
     defaults, hints and required-ness all visible in one line. Props are
     read-only inside (assigning is a compile error) and reactive.
   - **B `prop` lines** in the body (`prop title: str`) — scales better for
     many props, but less Python-like.

c) **Imports:**
   - **A ★ Python dotted, relative:** `from .components.button import Button`
     → `./components/button.tbd`. Everything top-level is exported; names
     starting with `_` are private.
   - **B Path strings:** `from "./components/button.tbd" import Button`.
     Explicit, no resolution rules, less Pythonic.

Output is one bundle per page, so imports are resolved at compile time.

## Q7. Global versus scoped styles; how scoping works

a) **Scoping implementation**
   - **A ★ One generated class per styled element** (`.t-3fa9c1`, hash of
     file + element path), added to that element; nested rules become
     `.t-3fa9c1:hover`, `.t-3fa9c1 a`, `@media … { .t-3fa9c1 {…} }`. The
     compiler flattens nesting, so no dependence on CSS nesting support.
     Matches "scoped to the element" literally. *Limitation:* descendant
     rules (`a:`) also reach into child components rendered inside.
   - **B Per-component attribute** (`[data-t-ab12]`, Vue). Scope is the
     component, not the element; descendant rules stop at child components,
     but every element gets an attribute.
   - **C Emit native `@scope`/nesting.** Least compiler work; browser support
     and specificity rules make output harder to reason about.

b) **Global styles:** **A ★ `style global:` only at file top level**, emitted
   as plain CSS (flattened, same syntax as scoped). **B** also allowed inside
   components. A keeps "where does this CSS live" obvious (example 04 would
   move its block to the top level).

c) **Dynamic values** (`color: {accent}`): **A ★** compile to
   `var(--t-3fa9c1-0)` and set the custom property inline from JS reactively.
   **B** disallow dynamic values; use `class:` toggles only.

## Q8. Comments versus `#id` versus hex colours

- **A ★ `#` starts a comment only when followed by a space or end of line**
  (and not inside a string). `div#main` and `#fff` are therefore never
  comments. `#nospace` at line start gets a helpful error.
- **B `//` comments.** Collides with floor division and `url(//cdn…)`.
- **C Comments only on their own line.** Simple, but no trailing comments.

## Q9. Attribute values, classes and raw HTML

a) **Value syntax:** **A ★ atom only** — string (with `{}`), number,
   `True/False/None`, name, dotted name, call, or `( any expression )`.
   **B JSX braces** `disabled={not valid}` — braces already mean
   interpolation in strings, so this overloads them.
b) **Booleans:** `True` renders the bare attribute, `False/None` omits it.
c) **Dynamic classes:** **A ★** `class:done=cond` toggles one class;
   `class=expr` (string or list) adds classes merged with the shorthand.
   **B** only `class=(dict)` à la Vue.
d) **Raw HTML:** **A ★** special attribute `html=expr` (sets innerHTML,
   name makes the risk visible). **B** a `raw` node.
e) **Names in tag heads** may contain `-` (`aria-label`, `data-id`,
   `todo-app`) because tag heads are lexed in their own mode.

## Q10. Entry point

- **A ★ `page "Title":` block**, at most one per file; a file with a page is
  an entry; attributes allowed (`page "Shop" lang="en"`).
- **B A component named `App` is mounted;** title via a `title` statement.
- **C Top-level markup is the page.** Least ceremony, but mixes with library
  files and global code.

## Q11. Events

- **A ★ `on <event>[.modifier…][(param)]:`** with modifiers `prevent`,
  `stop`, `once` only; parameter optional. Component "events" are callback
  props (`on_press=`), no custom event system in v1.
- **B No modifiers;** an implicit `event` name is always available.

## Q12. Derived values, effects and lifecycle

- **A ★ Keywords:** `derived x = expr` (cached, recomputed on change),
  `watch a, b:` (runs when listed names change), `on mount:` /
  `on unmount:`. Explicit about triggers.
- **B Auto-tracked `effect:`** instead of `watch` (runs when anything it read
  changes). Less typing, more surprise.
- **C Decorators:** `@derived def x(): …`. Very Python, more verbose.

## Q13. Two-way binding

- **A ★ `bind=target`**, property inferred from the element (text/select →
  `value`, checkbox → `checked`, number/range → number). Target must be an
  assignable path rooted at state or a loop item.
- **B `bind:value=target`** (Svelte) — explicit property, more to type.

## Q14. Slots / children

- **A ★ One default `slot` in v1;** named slots deferred (ADR records it).
- **B Named slots now** (`slot header`, `Card: header: …`) — more grammar.

## Q15. Light type checking (your choice: "light checking")

- **A ★ Check what's cheap and useful:** literal values vs hints for
  `state` and props; component call sites (unknown props, missing required
  props, literal type mismatch); arity of `def` calls in the same file.
  Types: `str int float bool None any list list[T] dict dict[K,V] X | Y` and
  component names. Warnings by default, `--strict` makes them errors.
- **B Local inference through expressions** (e.g. `count + "a"`). Real value,
  but it's a type system project of its own.

## Q16. Logic-language details (Python flavour, JS semantics)

a) **Dict/attribute access:** **A ★** `{name: 1}` bare keys are strings (JS
   style — *differs from Python*), `{"name": 1}` also allowed; `d.name` and
   `d["name"]` both work. **B** Python-strict: quoted keys, subscript only.

b) **Truthiness (a challenge to "JS semantics underneath"):** in JS `[]` and
   `{}` are truthy, so `if todos:` is always true — the most likely bug for a
   Python-minded author. **A ★** `if`/`while`/`and`/`or`/`not` use a 3-line
   `truthy()` helper with Python rules. **B** pure JS truthiness, documented.

c) **Exceptions:** **A ★** `except Exception as e:` (type optional:
   `except as e:` is not Python; I'd allow bare `except:` and `except T as e:`
   where `T` is an `instanceof` check, `Exception` matches all). **B** only
   `except e:` as in example 06.

d) **Scope of assignment:** in Python, `count += 1` inside a function needs
   `nonlocal`. **A ★** names declared at component level (state, props,
   plain variables) are always the component's when assigned inside `def`/
   `on`/`watch`; any other assigned name is local to the block. **B** require
   `nonlocal`. A is why plain `timer = None` must be declared at component
   level (example 07 `Clock` is currently wrong under A).

e) **Included:** `def`, `async def`/`await`, `return`, `if/elif/else`,
   `for`, `while`, `break/continue`, `try/except/finally`, `lambda`
   (expression-only), list comprehensions, `and/or/not/in/not in/is`,
   `== → ===`, `//`, `**`, conditional expressions, slicing (`[a:b]`).
   **Excluded in v1:** classes, generators, dict/set comprehensions,
   decorators, `with`, `global`, keyword-only/`*args`.

## Q17. Empty-list rendering — example 05's `for … else`

Python's `for/else` means "loop finished without `break`", not "empty".
- **A ★ No special syntax;** write `if not shown:` (works thanks to Q16b A).
- **B `empty:`** clause after `for` in markup only.
- **C Reuse `else`** in markup (Jinja style) — conflicts with Python meaning.

## Q18. JavaScript interop

- **A ★ Explicit `js` namespace:** `js.Date.new()`, `js.console.log(x)`,
  `js.document`; `.new(…)` constructs (Pyodide convention). The type checker
  treats `js.*` as `any`. Builtins cover common needs: `len str int float
  print range enumerate fetch_json every after cancel`.
- **B Unknown names fall through to JS globals** (`Date`, `console`) plus a
  `new` keyword. Less typing; typos become runtime errors.

Lambdas stay expression-only (Python); assignment inside a lambda (example 07
`Clock`) is an error — use a `def`.

## Q19. Compiled output format

- **A ★ Static HTML + targeted JS.** `index.html` contains every static
  element of the page; dynamic text/attributes in static elements are marked
  (`data-t="7"`) and filled by JS on load; dynamic regions (`if`, `for`,
  component instances) are comment anchors (`<!--t:3-->`) whose contents JS
  creates from compiled template functions. Phase 3 golden HTML is then
  meaningful before any JS exists. *Limitation:* without JS, dynamic text is
  blank.
- **B Shell HTML, JS renders everything.** One code path, but phase 3 has
  almost nothing to emit and page HTML is empty for crawlers/no-JS.
- **C Pre-render initial state at compile time** (evaluate in Python).
  Best HTML, but needs an interpreter for the language in the compiler.

Files: `dist/<page>/index.html`, `style.css`, `app.js` (runtime inlined at
the top of `app.js`, no separate runtime file).

## Q20. Hint syntax on `state`

`state todos: list = []` — **A ★** `name: Type = value` like Python
annotations everywhere (state, props, def params, returns `-> T`).
**B** hints only on props and def signatures.

## Q21. Name (three suggestions)

1. **Weft** (`.weft`) — the thread woven through the warp; markup, style and
   logic woven into one cloth. Short, easy to type. ★
2. **Strata** (`.strata`) — layers of a page in one file.
3. **Tessera** (`.tess`) — a mosaic tile; components as tiles.
