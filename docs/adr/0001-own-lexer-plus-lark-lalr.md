# 0001. Hand-written lexer feeding a Lark LALR parser

- Status: accepted
- Date: 2026-11-17
- Question: Q0

## Decision
A hand-written Python lexer with explicit modes (code, tag head, style,
string/interpolation) produces a token stream including INDENT/DEDENT.
Lark parses that stream with an LALR grammar via its custom-lexer hook.

## Alternatives
- Lark for everything (Indenter + contextual lexer).
- Hand-written recursive descent for lexing and parsing.

## Reason
The ambiguities of the language are lexical. Keeping them in readable
Python gives precise, friendly errors and a natural `tokens` debug mode,
while the grammar stays a readable `.lark` file.

## Consequences / known limitations
Two mechanisms to understand. The lexer must decide modes without parser
feedback, so mode switches must be decidable from the current line.
