# 0003. Output: static HTML plus targeted JS

- Status: accepted
- Date: 2026-11-17
- Question: Q19

## Decision
Each page builds to `dist/<page>/index.html`, `style.css` and `app.js`
(runtime inlined at the top of `app.js`). `index.html` contains every
static element. Dynamic text and attributes inside static elements are
marked with `data-t="<n>"` and filled by JS on load. Dynamic regions (`if`,
`for`, component instances) are comment anchors `<!--t:<n>-->` whose
contents JS creates from compiled template functions.

## Alternatives
- Shell HTML with JS rendering everything.
- Pre-render initial state at compile time (needs an interpreter).

## Reason
Static structure is visible without JS and phase 3 (markup to HTML) has
meaningful golden output before any JS exists.

## Consequences / known limitations
Without JS, dynamic text is blank and dynamic regions are empty. Two code
paths (static HTML and JS templates) for the same markup constructs.
