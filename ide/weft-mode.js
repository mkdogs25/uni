// Approximate Weft syntax highlighting for CodeMirror 5 (simple mode).
// Regex-based, so it is a guide only: the compiler's diagnostics are the
// authority (ADR 0023). Token class names map to .cm-* rules in ide.css.

(function () {
  const keywords =
    "and|as|async|await|break|component|continue|def|derived|elif|else|except|" +
    "finally|for|from|if|import|in|is|key|lambda|not|on|or|page|pass|return|" +
    "slot|state|style|global|try|watch|while|mount|unmount";

  // Strings with {interp}: push a state so braces inside are coloured.
  const stringRules = (quote, next) => [
    { regex: /\{\{|\}\}/, token: "string" },
    { regex: /\{[^}]*\}/, token: "interp" },
    { regex: /\\./, token: "string" },
    { regex: new RegExp(quote), token: "string", next },
    { regex: new RegExp("[^\\\\{" + quote[0] + "]+"), token: "string" },
    { regex: /./, token: "string" },
  ];

  CodeMirror.defineSimpleMode("weft", {
    start: [
      // Comments: '#' followed by space or end of line (ADR 0007).
      { regex: /#(?=\s|$).*/, token: "comment" },
      { regex: /r"[^"]*"|r'[^']*'/, token: "string" },
      { regex: /"""/, token: "string", next: "tdq" },
      { regex: /"/, token: "string", next: "dq" },
      { regex: /'/, token: "string", next: "sq" },
      // Style declaration at line start: "property: value".
      { regex: /(\s*)(--?[a-z][a-z0-9-]*)(:)(?=\s+\S)/, sol: true, token: [null, "property", null] },
      // Line-start keyword.
      { regex: new RegExp("(\\s*)(" + keywords + ")\\b"), sol: true, token: [null, "keyword"] },
      // Line-start component (capitalised) or tag name.
      { regex: /(\s*)([A-Z][A-Za-z0-9]*)/, sol: true, token: [null, "component"] },
      { regex: /(\s*)([a-z][a-z0-9-]*)(?=[\s.#:]|$)(?!\s*[+\-*/%]?=[^=])/, sol: true, token: [null, "tag"] },
      { regex: /[.#][A-Za-z_][\w-]*/, token: "shorthand" },
      { regex: /[A-Za-z_][\w-]*(?::[\w-]+)?(?==)(?!==)/, token: "attribute" },
      { regex: new RegExp("\\b(" + keywords + ")\\b"), token: "keyword" },
      { regex: /\b(True|False|None)\b/, token: "atom" },
      { regex: /#[0-9a-fA-F]{3,8}\b/, token: "number" },
      { regex: /\d[\d_]*(\.\d+)?([eE][+-]?\d+)?(px|rem|em|ms|s|%|vh|vw|fr|deg)?/, token: "number" },
      { regex: /[A-Za-z_][\w]*/, token: null },
      { regex: /./, token: null },
    ],
    dq: stringRules('"', "start"),
    sq: stringRules("'", "start"),
    tdq: [
      { regex: /"""/, token: "string", next: "start" },
      { regex: /\{\{|\}\}/, token: "string" },
      { regex: /\{[^}]*\}/, token: "interp" },
      { regex: /[^"{]+/, token: "string" },
      { regex: /./, token: "string" },
    ],
    meta: { lineComment: "# " },
  });
})();
