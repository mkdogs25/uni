# Weft language specification (v1 draft)

Status: **draft, awaiting approval**. Decisions are in `adr/`; this document
turns them into rules precise enough to implement. Where it says "ADR nnnn"
the ADR is the authority; if the two disagree, the ADR wins and this file is
wrong.

## 0. Details introduced by this spec — please approve or change

The ADRs left these open. Each is my proposal; none is implemented.

| # | Proposal | Alternative |
|---|----------|-------------|
| S1 | Keyed loops: `for x in xs key expr:` (contextual word `key`). | `for x in xs:` with `key=` on the child element. |
| S2 | A bare string on its own line in markup is a text node. | Require a `text "..."` keyword. |
| S3 | Reactivity granularity is **per state variable**: any mutation anywhere inside `todos` notifies every reader of `todos`. Keyed `for` keeps DOM work small. | Per-property signals inside proxies (finer, more runtime). |
| S4 | Generated JS reads/writes state as `count.v` (a signal object with a `v` getter/setter), so output stays readable. | Solid-style `count()` / `setCount()`. |
| S5 | Plain `name = value` at component/page level is a **non-reactive** per-instance variable (e.g. `timer`). | Make every component-level variable reactive. |
| S6 | Scoped class = `t-` + first 6 hex digits of SHA-1 of `"<relative path>:<element path>"`, element path being child indices like `0.2.1`. Deterministic across builds; changes when the tree above the element changes. | Sequential per file (`t-counter-3`). |
| S7 | Unknown lowercase tag names without a hyphen are a **warning** (catches `dvi`). | No check. |
| S8 | Props are passed as thunks (getters), so a child re-reads the parent's expression reactively. | Pass values plus a separate update mechanism. |
| S9 | The checker is a separate phase **6b** between components and CLI polish. | Fold it into phase 6. |
| S10 | Golden tests also cover `tokens` and `ast` JSON for every example, so phases 1–2 have goldens. | HTML/CSS/JS goldens only. |

---

## 1. Source files

- UTF-8, extension `.weft`, Unix or Windows line endings (normalised to `\n`).
- A file containing a top-level `page` block is an **entry**; otherwise it is
  a **library** (ADR 0012). Building a library on its own is an error.

## 2. Lexical structure

The lexer is hand-written (ADR 0001) and works line by line, keeping a stack
of **block contexts**. Every token carries `line`, `col`, `end_line`,
`end_col` for error messages.

### 2.1 Physical and logical lines

- Indentation uses spaces only; a tab in leading whitespace is an error
  (ADR 0009). Width is free, but each block must be consistent.
- Blank lines and lines containing only a comment are ignored entirely
  (no NEWLINE, no indentation effect).
- A logical line continues past the physical line when:
  - a bracket `(` `[` `{` is open (implicit joining), or
  - the line ends with `\` (explicit joining; the `\` must be the last
    character before the newline or a comment is an error), or
  - a triple-quoted string is open.
  Continuation lines' indentation is ignored.

### 2.2 Indentation algorithm (Python's)

A stack starts at `[0]`. For each logical line, with `n` = its leading
spaces:
- `n > top`: push `n`, emit `INDENT`.
- `n == top`: nothing.
- `n < top`: pop while `top > n`, emitting one `DEDENT` per pop; if `top != n`
  afterwards, error *"unindent does not match any outer indentation level"*.
Each logical line ends with `NEWLINE`. At EOF, emit `NEWLINE` (if missing),
one `DEDENT` per remaining level, then `EOF`.

### 2.3 Comments (ADR 0007)

Outside strings, `#` starts a comment if followed by a space, a tab or end of
line. Otherwise `#` is ordinary text (`#main`, `#fff`). A logical line whose
first non-space character is `#` followed by a non-space is an error with the
hint *"comments need a space after #"*.

### 2.4 Block contexts and line classification

The context of a line is the kind of block it sits in. The lexer decides the
**mode** of each line from its context and its first token; this is the only
place mode decisions are made.

| Context | Opened by | Lines inside are |
|---------|-----------|------------------|
| `module` | file start | code lines (imports, `def`, `component`, `page`, `style global`, assignments) |
| `body` | `component …:` / `page …:` | declaration lines **or** markup lines |
| `markup` | a tag line ending in `:`, markup `if/elif/else/for` | markup lines |
| `code` | `def`, `async def`, `on …:`, `watch …:`, code `if/for/while/try/…` | code lines |
| `style` | `style:` / `style global:` / a nested style rule | style lines |

Classification of a line in `body` or `markup` context, by first word:

1. `style` → style header; body context `style`.
2. `on` → event or lifecycle header (code mode until `:`); body `code`.
3. `if` / `elif` / `else` / `for` → markup control (code mode until the
   final `:`); body inherits `markup`.
4. `slot` → slot line.
5. A string literal → text node (S2).
6. **Only in `body`:** `state`, `derived`, `def`, `async`, `watch`, or a
   NAME followed by `=`, `:<space>…=` (hinted declaration) or an augmented
   operator → declaration line (code mode).
7. Otherwise → tag line (tag-head mode).

A declaration-shaped line in `markup` (e.g. `x = 1` under a `div`) is an
error: *"statements are not allowed in markup; put them in a def or an on
block"* (ADR 0009).

`mount` and `unmount` after `on` are lifecycle hooks and are only valid in
`body` (ADR 0014).

### 2.5 Code mode tokens

- `NAME`: `[A-Za-z_][A-Za-z0-9_]*`. Keywords: `and as async await break
  component continue def derived elif else except False finally for from if
  import in is lambda None not on or page pass return slot state style True
  try watch while`. `key`, `global`, `mount`, `unmount` are contextual.
- `NUMBER`: integers, decimals, exponents, `_` separators. No complex numbers.
- `STRING`: see 2.8.
- Operators: `+ - * / // % ** == != < <= > >= = += -= *= /= //= %= ( ) [ ] {
  } , : . -> |` and `\`.

### 2.6 Tag-head mode (ADRs 0005, 0008)

A tag line is lexed as:

```
TAG_NAME  [CLASS | ID]*  (ATTR | TEXT)*  [":"]
```

- `TAG_NAME`: `[A-Za-z][A-Za-z0-9-]*`. Capitalised → component (ADR 0010).
- `CLASS` / `ID`: `.name` / `#name`, glued to the previous item with no space;
  names may contain `-`.
- `ATTR`: `name=` (name may contain `-` and one `:` as in `class:done`), then
  one value atom lexed in code mode: string, number, `True/False/None`, NAME
  with `.name` / call / subscript suffixes, or a bracketed expression `( … )`.
  The atom ends at the first space at bracket depth 0.
- `TEXT`: a string literal; at most one, and it must be the last item before
  the optional `:` (an attribute or a second string after it is an error).
- A final `:` means the line opens a `markup` block. A `:` not at the end of
  the line is an error.

### 2.7 Style mode (ADR 0004)

A style line is either a **rule** or a **declaration**:

- **Rule:** the line (comment removed, trimmed) ends with `:` **and** the
  next non-blank line is indented deeper. Token `STYLE_RULE(selector)`,
  where selector is the text before the final `:`. A quoted selector has its
  quotes removed.
- **Declaration:** otherwise. Property = leading `--?[A-Za-z][A-Za-z0-9-]*`,
  then optional spaces, then `:`; value = the rest of the line, trimmed.
  Token `STYLE_DECL(prop, value)`. The value may contain `{expr}` (lexed as an
  interpolated string) for dynamic values (ADR 0011). A line matching neither
  is an error.
- A line ending in `:` with no deeper block is an error: *"empty style rule"*.

Selector translation (done in the AST builder, not the lexer):

| Written | Becomes |
|---------|---------|
| known pseudo-class `hover`, `nth-child(2)` | `&:hover`, `&:nth-child(2)` |
| known pseudo-element `before`, `placeholder` | `&::before` |
| starts with `&`, `.`, `#`, `:`, `[`, `>`, `+`, `~`, `@`, `*` or a quote | as written |
| known HTML element name | descendant `& a` |
| anything else | warning *"unknown selector 'hovr'"*, then treated as an element |

`@media`/`@supports`/`@container` rules wrap their contents; nested rules
inside them still resolve against the enclosing element.

### 2.8 Strings (ADR 0009)

- Delimiters: `"…"`, `'…'`, `"""…"""`, `'''…'''`; prefix `r` for raw.
- Escapes (non-raw): `\\ \" \' \n \t \r \{ \} \u{XXXX}`. `{{` and `}}` are
  literal braces.
- `{` starts an interpolation; the lexer scans to the matching `}` tracking
  bracket depth and nested strings, so `"{'a' if x else 'b'}"` is fine. The
  expression text is kept with its source offset and parsed later as an
  `expr`. A `:` at depth 0 inside an interpolation is an error (*"format specs
  are not supported; use a function"*).
- Triple-quoted dedent: if the opening delimiter is followed immediately by
  a newline, that newline is dropped; the closing delimiter must then be on
  its own line, and its column `c` is stripped from every content line. A
  non-blank content line indented less than `c` is an error. The final
  newline before the closing delimiter is dropped. If the opening delimiter
  is followed by text on the same line, no dedent happens.
- Text node whitespace: emitted exactly as the string's value (no HTML
  whitespace collapsing by the compiler; the browser collapses as usual).

## 3. Grammar

Written as Lark-style EBNF over the token stream. Lowercase are rules,
uppercase are tokens. This is the shape; the `.lark` file will follow it.

```
module      : (import | def | component | page | global_style | assign | NEWLINE)*
import      : "from" rel_module "import" NAME ("," NAME)* NEWLINE
rel_module  : "."+ NAME ("." NAME)*

component   : "component" NAME params? ":" NEWLINE INDENT body DEDENT
page        : "page" STRING tag_attr* ":" NEWLINE INDENT body DEDENT
params      : "(" [param ("," param)*] ")"
param       : NAME [":" type] ["=" expr]

body        : (decl | node)+
decl        : state | derived | plain_var | def | watch | lifecycle
state       : "state" NAME [":" type] "=" expr NEWLINE
derived     : "derived" NAME [":" type] "=" expr NEWLINE
plain_var   : NAME [":" type] "=" expr NEWLINE
watch       : "watch" NAME ("," NAME)* ":" block
lifecycle   : "on" ("mount" | "unmount") ":" block

node        : element | text_node | m_if | m_for | slot | style_block | event
element     : TAG_NAME (CLASS | ID)* tag_attr* [TEXT] (":" NEWLINE INDENT node+ DEDENT | NEWLINE)
tag_attr    : ATTR_NAME atom
text_node   : STRING NEWLINE
m_if        : "if" expr ":" mblock ("elif" expr ":" mblock)* ["else" ":" mblock]
m_for       : "for" targets "in" expr ["key" expr] ":" mblock
mblock      : NEWLINE INDENT node+ DEDENT
slot        : "slot" NEWLINE
event       : "on" NAME ("." NAME)* ["(" NAME ")"] ":" block

style_block : "style" ":" NEWLINE INDENT style_item+ DEDENT
global_style: "style" "global" ":" NEWLINE INDENT style_item+ DEDENT
style_item  : STYLE_DECL NEWLINE | STYLE_RULE NEWLINE INDENT style_item+ DEDENT

def         : ["async"] "def" NAME params ["->" type] ":" block
block       : NEWLINE INDENT stmt+ DEDENT
stmt        : simple NEWLINE | if | for | while | try
simple      : expr | target ("=" | AUGOP) expr | "return" [expr] | "pass"
            | "break" | "continue"
if          : "if" expr ":" block ("elif" expr ":" block)* ["else" ":" block]
for         : "for" targets "in" expr ":" block
while       : "while" expr ":" block
try         : "try" ":" block ("except" [expr ["as" NAME]] ":" block)* ["finally" ":" block]

type        : type_atom ("|" type_atom)*
type_atom   : NAME ["[" type ("," type)* "]"] | "None"

expr        : lambda | ternary
lambda      : "lambda" [NAME ("," NAME)*] ":" expr
ternary     : or_ ["if" or_ "else" expr]
or_ / and_ / not_ / comparison / arith / term / factor / power / await_ / primary
            : the usual Python precedence ladder (comparison includes
              in, not in, is, is not; no chained comparisons in v1)
primary     : atom (call | "." NAME | "[" subscript "]")*
atom        : NAME | NUMBER | STRING | "True" | "False" | "None"
            | "(" expr ")" | list | dict | listcomp
listcomp    : "[" expr "for" targets "in" expr ["if" expr] "]"
dict        : "{" [(NAME | STRING) ":" expr ("," ...)* [","]] "}"
```

`if`/`for` mean markup control in `body`/`markup` context and statements in
`code` context; the lexer's context tracking (2.4) emits distinct tokens
(`M_IF`, `IF`, …) so the LALR grammar has no conflict here.

## 4. Semantics

### 4.1 Scopes and names (ADR 0017)

- **Module scope:** imports, `def`s, components, module-level assignments
  (constants; not reactive).
- **Component/page scope:** props, `state`, `derived`, plain variables (S5),
  `def`s, per instance.
- **Block scope:** inside `def`/`on`/`watch` bodies, assigning a name that is
  not a component-level or module-level name creates a block-local `let`.
  Assigning a component-level name assigns the component's (no `nonlocal`).
  Assigning a module-level name from a block is an error.
- Loop variables of markup `for` are visible in that loop's markup and in
  handlers inside it.
- Unknown names are compile errors (ADR 0019). Builtins: `len str int float
  bool print range enumerate fetch_json every after cancel`; `js` is the JS
  global namespace.

### 4.2 Values and operators

JS values underneath: numbers are doubles, `None` is `null`, lists are
arrays, dicts are plain objects. Differences from Python, all deliberate:

| Construct | Behaviour |
|-----------|-----------|
| truthiness | Python rules via `truthy()` (ADR 0017) |
| `==`, `!=` | `===`, `!==` (lists compare by identity) |
| `//`, `%` | floor division and Python-style modulo via helpers |
| `**` | `**` |
| `in` | list → `includes`, dict → own key, string → substring |
| `xs[-1]` | **not** supported (JS `undefined`); use `xs[len(xs) - 1]` |
| `a[b:c]` | `slice(b, c)` for lists and strings |
| `+` | JS `+` (so `"a" + 1` is `"a1"`, no TypeError) |
| int overflow | becomes float; no big integers |
| methods | JS methods on values work (`s.toUpperCase()`); Python-named helpers available: `s.strip()`, `s.lower()`, `s.upper()`, `s.split()`, `xs.append()`, `xs.pop()`, `xs.insert()`, `xs.remove()`, `d.get()`, `d.keys()`, `d.values()`, `d.items()` — implemented as runtime helpers |

### 4.3 Markup

- Elements render as HTML elements; void elements (`img`, `input`, `br`,
  `hr`, `meta`, `link`, …) must not have children or text.
- Text and attribute strings are HTML-escaped; `html=` is not (ADR 0008).
- `class` = shorthand classes ∪ `class=expr` (string split on spaces, or a
  list) ∪ toggled `class:name=cond`, plus the scoped class if styled.
- Boolean attributes: `True` → present with no value, `False`/`None` →
  omitted; other values are stringified.
- `bind=` per ADR 0015.

### 4.4 Reactivity (ADR 0002, S3, S4)

- `state x = e` creates a signal holding `e`'s value. If the value is a list
  or dict it is wrapped in a deep proxy: any set/delete/mutating call
  anywhere inside notifies `x`'s signal. Reassigning `x` replaces the value
  (and wraps the new one).
- `derived d = e` is a lazily recomputed, cached signal; it re-evaluates
  when a signal it read last time changes. Assigning to it is an error.
- Every *dynamic* markup part — interpolated text, attribute, class toggle,
  style variable, `if` condition, `for` list — is an **effect**: a function
  that runs once, records which signals it read, and re-runs when any of them
  changes.
- Writes during an event handler or async continuation are batched; effects
  run once in a microtask after the handler returns.
- `if`: when the chosen branch changes, the old branch's DOM is removed
  (running `on unmount` of components inside) and the new branch is built.
- `for … key k`: reconciles by key — reuses DOM for surviving keys, moves,
  inserts and removes. Without `key`, reconciles by index (items are patched
  in place, extra ones added or removed). Loop variables are passed to each
  item's template as signals, so item content updates in place.
- `watch a, b:` runs its body after a change to `a` or `b` (batched, once
  per flush); never on first render.
- `on mount:` runs after the instance's DOM is in the document; `on
  unmount:` before it is removed. Timers started with `every`/`after` are
  **not** cancelled automatically (call `cancel`).

### 4.5 Events (ADR 0013)

`on click:` adds a listener on the enclosing element. `.prevent` calls
`preventDefault()`, `.stop` calls `stopPropagation()`, `.once` adds
`{once: true}`. `(e)` binds the event object. Handlers may `await`.

### 4.6 Components (ADRs 0010, 0016, S8)

- A component call `Card title="x" featured=True:` passes props; each prop
  value is compiled as a thunk so the child sees updates. Unknown props are
  errors; missing required props are errors; type mismatches are checker
  warnings (ADR 0020).
- Props are read-only inside the component.
- The caller's child markup, if any, renders at the component's `slot`, in
  the caller's scope.
- Each use is a new instance with its own state.

### 4.7 Styles (ADRs 0004, 0011)

- An element with `style:` gets class `t-xxxxxx` (S6). Declarations go in a
  rule for `.t-xxxxxx`; nested rules are flattened by substituting `&` with
  `.t-xxxxxx` (and prefixing `.t-xxxxxx ` for descendant selectors).
- At-rules are hoisted to the top level with the element rule inside.
- Dynamic value `{e}` → `var(--t-xxxxxx-N)`; an effect sets
  `el.style.setProperty("--t-xxxxxx-N", value)`.
- Styles inside a component get one class per element definition, shared by
  all instances.
- `style global:` emits rules as written (flattened), before scoped rules.
- Order of CSS output: globals in import order, then scoped rules in source
  order. No autoprefixing, no minification.

### 4.8 Imports

`from .a.b import X` loads `./a/b.weft` relative to the importing file
(`..` for the parent). Cycles are an error. Every imported file's global
styles and used components are bundled into the page. `_names` cannot be
imported.

### 4.9 Type checking (ADRs 0020, 0021, S9)

As ADR 0020. Output: `file:line:col: warning: …`; `--strict` turns warnings
into errors and a non-zero exit code.

## 5. Compiled output

`weft build examples/01_counter.weft -o dist` writes `dist/01_counter/`:

### 5.1 `index.html`

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Counter</title>
<link rel="stylesheet" href="style.css">
<script src="app.js" defer></script>
</head>
<body>
<div id="main" class="box t-1a2b3c">
<h1>Hello</h1>
<button class="primary t-4d5e6f" data-t="1"></button>
<!--t:2-->
<ul><!--t:3--></ul>
<a class="link" href="/home">Home</a>
<img src="cat.png" alt="A cat">
</div>
</body>
</html>
```

- Static elements are written in full. Elements with dynamic content or
  attributes, or with events/binds, carry `data-t="<n>"`. Dynamic regions
  (`if`, `for`, component instances, `slot`) are a comment anchor
  `<!--t:<n>-->`; JS inserts their DOM before the anchor.
- Page attributes go on `<html>`. Output is indented one element per line
  for readable golden diffs (whitespace inside text is preserved exactly).

### 5.2 `style.css`

```css
/* weft: 01_counter.weft */
.t-1a2b3c { padding: 16px; border-radius: 8px; }
.t-4d5e6f { padding: 8px 16px; background: blue; }
.t-4d5e6f:hover { background: darkblue; }
```

### 5.3 `app.js`

```js
// weft runtime vX (inlined, ~200 lines): signal, derived, effect, batch,
// deep proxy, truthy, list helpers, if/for/component mounting.
const W = (() => { /* … */ })();

// ---- 01_counter.weft ----
W.page(() => {
  const count = W.state(0);
  const items = W.state([{name: "Apples"}, {name: "Pears"}]);

  const n1 = W.node(1);                       // <button data-t="1">
  W.text(n1, () => `Clicked ${W.str(count.v)}`);
  W.on(n1, "click", () => { count.v += 1; });

  W.if_(W.anchor(2), [
    [() => W.truthy(count.v > 5), () => W.h("p", {}, ["That's a lot of clicks"])],
    [null, () => W.h("p", {}, ["Keep going"])],
  ]);

  W.for_(W.anchor(3), () => items.v, null, (item) =>
    W.h("li", {}, [() => W.str(item.v.name)]));
});
```

- One top-level function per component: `function Card(props, slot) {…}`
  returning a DOM fragment; `props.title` is a getter.
- Generated code is formatted readably (2-space indent, one statement per
  line), and each block has a `// file:line` comment for debugging.
- The runtime is the same text in every build; it is a checked-in file
  `weft/runtime.js` copied verbatim.

## 6. CLI

```
weft tokens FILE           # token stream as JSON
weft ast FILE              # AST as JSON
weft check FILE [--strict] # parse + type check, warnings only
weft build FILE [-o DIR] [--strict]
weft watch FILE [-o DIR]   # rebuild on change (phase 7)
```

Errors: `path:line:col: error: message`, then the source line and a caret
under the column, then an optional `hint:` line. Exit code 1 on error.

## 7. Implementation plan and test gates

Package layout: `weft/` (`lexer.py`, `grammar.lark`, `parser.py`, `ast.py`,
`html.py`, `css.py`, `js.py`, `check.py`, `runtime.js`, `cli.py`), `tests/`.
Dependencies: Python ≥ 3.11, `lark`, `pytest`. Optional: `watchfiles` for
watch mode.

| Phase | Delivers | Gate |
|-------|----------|------|
| 1 | Lexer incl. modes, indent/dedent, strings | unit tests for every rule in §2 + `tokens.json` goldens for all examples (S10) |
| 2 | Parser → AST (JSON-serialisable dataclasses) | `ast.json` goldens + parse-error tests |
| 3 | Static markup → `index.html` | `index.html` goldens |
| 4 | Style blocks → `style.css` | `style.css` goldens + selector table tests |
| 5 | Logic, reactivity, events → `app.js` | `app.js` goldens + browser smoke tests (Playwright) clicking through 01, 02, 04 |
| 6 | Components, props, slots, imports | goldens for 03, 07, 08 + error tests |
| 6b | Type checker | warning goldens per example + targeted tests |
| 7 | CLI polish, error messages, watch | error-message goldens; watch test |

Test rules (from your brief): golden files under `tests/golden/<example>/`;
tests run the real CLI via `subprocess` as well as in-process; `pytest
--update-goldens` regenerates (reviewed in the diff); a **meta-test** copies
the package to a temp dir, applies deliberate breakages (e.g. swap INDENT and
DEDENT, drop the scoped class), runs the suite against it, and asserts it
fails. Every phase re-runs all earlier phases' tests.

## 8. Known limitations (v1)

- No content without JS for dynamic parts; no SSR (ADR 0003).
- Descendant style rules leak into child components (ADR 0011).
- Pseudo-class detection uses a lookup table (ADR 0004).
- No negative indexing, format specs, classes, named slots, router.
- Per-state-variable invalidation (S3) can over-update large nested state.
- `html=` is unsanitised.
