# 0007. Comments are '#' followed by a space or end of line

- Status: accepted
- Date: 2026-11-17
- Question: Q8

## Decision
Outside strings, `#` starts a comment only when followed by a space or the
end of the line. `div#main` and `#fff` are never comments. A line starting
with `#` followed by a non-space character gets a helpful error.

## Alternatives
- `//` comments (collide with floor division and `url(//cdn...)`).
- Comments only on their own line.

## Reason
Matches normal Python style (`# comment`) while leaving `#id` shorthand and
hex colours unambiguous.

## Consequences / known limitations
`#comment` without a space is not a comment. In style values, a `# ` after
whitespace ends the value, so `content: "# "` must stay inside quotes.
