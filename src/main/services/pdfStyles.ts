// PDF stylesheet ported from md-to-pdf (src/styles.css)
export const PDF_STYLES = `
/* ============================================================
   md2pdf — editorial report stylesheet
   Print-first design: serif/sans pairing, hairline rules,
   booktabs tables, restrained monochrome + oxblood accent.
   ============================================================ */

:root {
  --ink: #21242a;          /* near-black, headings & strong rules */
  --body-color: #2c2f35;   /* body text */
  --soft: #4a4d53;         /* secondary text */
  --muted: #6f6b64;        /* captions, meta (warm gray) */
  --faint: #a39f97;        /* lightest text */
  --rule: #dcd8d0;         /* hairlines (warm) */
  --rule-strong: #21242a;  /* structural rules */
  --paper: #faf9f6;        /* code background (warm paper) */
  --paper-line: #e7e3da;
  --accent: #8a3b34;       /* oxblood — used sparingly */
  --serif: 'Noto Serif KR', 'Source Serif 4', Georgia, 'Times New Roman',
    'AppleMyungjo', serif;
  --sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont,
    'Apple SD Gothic Neo', 'Segoe UI', 'Noto Sans KR', 'Malgun Gothic',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  --mono: 'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, Monaco,
    'Courier New', monospace;
  --display: var(--sans); /* heading face — switched to serif via --serif option */
  --text: var(--sans); /* body face — switched to serif via --serif option */
}

body.serif {
  --display: var(--serif);
  --text: var(--serif);
}

* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

html {
  font-size: 10pt;
}

body {
  margin: 0;
  font-family: var(--text);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.8;
  color: var(--body-color);
  word-break: keep-all;
  overflow-wrap: break-word;
  font-feature-settings: 'tnum';
}

/* ------------------------------------------------------------
   Document header — masthead style
   ------------------------------------------------------------ */
.doc-header {
  margin: 0 0 3em;
  border-top: 3px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
  padding: 1.1em 0 1.5em;
}

.doc-eyebrow {
  display: flex;
  align-items: baseline;
  gap: 1.4em;
  font-size: 7.5pt;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 1.6em;
}

.doc-eyebrow .doc-date {
  margin-left: auto;
  font-weight: 400;
  letter-spacing: 0.12em;
}

.status-badge {
  font-weight: 600;
}
.status-badge.draft { color: var(--faint); }
.status-badge.in-progress { color: #a06616; }
.status-badge.stable { color: #3a7d4f; }

.doc-title {
  margin: 0 0 0.55em;
  font-family: var(--display);
  font-size: 22pt;
  font-weight: 800;
  line-height: 1.38;
  letter-spacing: -0.01em;
  color: var(--ink);
}

body.serif .doc-title {
  font-size: 23pt;
  font-weight: 700;
  letter-spacing: -0.005em;
}

.doc-meta {
  font-size: 8.5pt;
  color: var(--muted);
  letter-spacing: 0.01em;
}

.doc-meta .sep {
  margin: 0 0.65em;
  color: var(--faint);
}

.doc-meta strong {
  font-weight: 600;
  color: var(--soft);
}

/* ------------------------------------------------------------
   Table of contents — book style, no box
   ------------------------------------------------------------ */
.toc {
  margin: 0 0 3.4em;
  padding: 0 0 1.6em;
  border-bottom: 1px solid var(--rule);
  break-inside: avoid;
}

.toc-title {
  font-family: var(--display);
  font-size: 10pt;
  font-weight: 800;
  letter-spacing: 0.5em;
  color: var(--ink);
  margin: 0 0 1.1em;
}

body.serif .toc-title {
  font-weight: 700;
}

.toc ol {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: toc1;
}

.toc li {
  margin: 0;
  font-size: 9.5pt;
  line-height: 2.1;
}

.toc li a {
  color: var(--soft);
  text-decoration: none;
}

.toc li.toc-d1 {
  counter-increment: toc1;
  counter-reset: toc2;
}
.toc li.toc-d1 > a {
  font-weight: 600;
  color: var(--ink);
}
.toc li.toc-d1 > a::before {
  content: counter(toc1);
  display: inline-block;
  width: 2.1em;
  font-family: var(--display);
  font-weight: 600;
  color: var(--accent);
}

.toc li.toc-d2 {
  counter-increment: toc2;
  counter-reset: toc3;
}
.toc li.toc-d2 > a::before {
  content: counter(toc1) '.' counter(toc2);
  display: inline-block;
  width: 2.6em;
  margin-left: 2.1em;
  font-size: 8.5pt;
  color: var(--faint);
}

.toc li.toc-d3 {
  counter-increment: toc3;
}
.toc li.toc-d3 > a {
  color: var(--muted);
}
.toc li.toc-d3 > a::before {
  content: counter(toc1) '.' counter(toc2) '.' counter(toc3);
  display: inline-block;
  width: 3.4em;
  margin-left: 4.7em;
  font-size: 8.5pt;
  color: var(--faint);
}

/* ------------------------------------------------------------
   Headings — serif display, hairline section dividers
   ------------------------------------------------------------ */
h1, h2, h3, h4, h5, h6 {
  line-height: 1.45;
  break-after: avoid-page;
}

h1 {
  font-family: var(--display);
  font-size: 15pt;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 3em 0 1.1em;
  padding-top: 1em;
  border-top: 1px solid var(--rule-strong);
}

h2 {
  font-family: var(--display);
  font-size: 12pt;
  font-weight: 700;
  color: var(--ink);
  margin: 2.4em 0 0.85em;
}

body.serif h1 {
  font-size: 15.5pt;
  font-weight: 700;
  letter-spacing: 0;
}

body.serif h2 {
  font-size: 12.5pt;
  font-weight: 600;
}

h3 {
  font-size: 10.8pt;
  font-weight: 700;
  color: var(--ink);
  margin: 2em 0 0.7em;
}

h4 {
  font-size: 10pt;
  font-weight: 700;
  color: var(--soft);
  margin: 1.8em 0 0.55em;
}

h5 {
  font-size: 9.5pt;
  font-weight: 600;
  color: var(--muted);
  margin: 1.6em 0 0.5em;
}

h6 {
  font-size: 8pt;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--faint);
  margin: 1.6em 0 0.5em;
}

.doc-header + h1,
.toc + h1 {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

/* Without a masthead, the document's leading H1 is the de-facto title —
   give it title presence instead of section styling. */
body > h1:first-child,
body > nav.toc:first-child + h1 {
  font-size: 20pt;
  line-height: 1.35;
  margin: 0 0 1.2em;
  padding-top: 0;
  padding-bottom: 0.55em;
  border-top: none;
  border-bottom: 2.5px solid var(--rule-strong);
}

/* Numbered headings (--numbered) */
body.numbered {
  counter-reset: sec1;
}
body.numbered h1:not(.doc-title) {
  counter-increment: sec1;
  counter-reset: sec2;
}
body.numbered h1:not(.doc-title)::before {
  content: counter(sec1);
  font-family: var(--display);
  color: var(--accent);
  margin-right: 0.85em;
}
body.numbered h2 {
  counter-increment: sec2;
  counter-reset: sec3;
}
body.numbered h2::before {
  content: counter(sec1) '.' counter(sec2);
  font-family: var(--display);
  color: var(--accent);
  margin-right: 0.8em;
}
body.numbered h3 {
  counter-increment: sec3;
}
body.numbered h3::before {
  content: counter(sec1) '.' counter(sec2) '.' counter(sec3);
  color: var(--faint);
  font-weight: 600;
  margin-right: 0.75em;
}

/* ------------------------------------------------------------
   Body text & inline styles
   ------------------------------------------------------------ */
p {
  margin: 0 0 1em;
  orphans: 3;
  widows: 3;
}

strong {
  font-weight: 700;
  color: var(--ink);
}

em {
  font-style: italic;
}

del {
  color: var(--faint);
  text-decoration-color: var(--faint);
}

a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 0.5px;
  text-decoration-color: rgba(138, 59, 52, 0.4);
  text-underline-offset: 2.5px;
}

code {
  font-family: var(--mono);
  font-size: 0.87em;
  color: var(--ink);
  background: var(--paper);
  border: 0.5px solid var(--paper-line);
  border-radius: 2px;
  padding: 0.05em 0.35em;
}

hr {
  border: none;
  border-top: 1px solid var(--faint);
  width: 64px;
  margin: 3em auto;
}

/* ------------------------------------------------------------
   Blockquote — editorial, no fill
   ------------------------------------------------------------ */
blockquote {
  margin: 1.6em 0 1.6em 0.15em;
  padding: 0.15em 0 0.15em 1.3em;
  border-left: 2px solid var(--ink);
  color: var(--soft);
  break-inside: avoid;
}

blockquote p {
  margin: 0 0 0.5em;
}
blockquote p:last-child {
  margin-bottom: 0;
}

blockquote blockquote {
  border-left-color: var(--rule);
  margin: 0.7em 0;
}

/* ------------------------------------------------------------
   Lists — dash bullets, restrained markers
   ------------------------------------------------------------ */
ul, ol {
  margin: 0.45em 0 1.15em;
  padding-left: 1.45em;
}

li {
  margin: 0.24em 0;
}

li p {
  margin: 0 0 0.35em;
}

li > ul,
li > ol {
  margin: 0.25em 0 0.35em;
}

ul {
  list-style-type: '–   ';
}
ul ul {
  list-style-type: '·   ';
}
ul ul ul {
  list-style-type: '◦   ';
}
ol {
  list-style-type: decimal;
}
ol ol {
  list-style-type: lower-alpha;
}
ol ol ol {
  list-style-type: lower-roman;
}

ul > li::marker {
  color: var(--muted);
}
ol > li::marker {
  color: var(--muted);
  font-feature-settings: 'tnum';
}

/* ------------------------------------------------------------
   Task lists
   ------------------------------------------------------------ */
ul.task-list {
  list-style: none;
  padding-left: 0.15em;
}

ul.task-list ul.task-list {
  padding-left: 1.5em;
  margin-top: 0.25em;
  margin-bottom: 0;
}

li.task-list-item {
  list-style: none;
}

.task-checkbox {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 1.2px solid var(--muted);
  border-radius: 2px;
  background: #fff;
  margin-right: 0.6em;
  vertical-align: -1px;
  position: relative;
}

.task-checkbox.checked {
  background: var(--ink);
  border-color: var(--ink);
}

.task-checkbox.checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 3px;
  height: 6.5px;
  border: solid #fff;
  border-width: 0 1.6px 1.6px 0;
  transform: rotate(42deg);
}

/* Regular lists nested inside task items keep their markers */
ul.task-list li ul:not(.task-list) {
  list-style-type: '–   ';
  padding-left: 2.9em;
  margin-top: 0.25em;
  margin-bottom: 0;
}
ul.task-list li ol {
  list-style-type: decimal;
  padding-left: 2.9em;
  margin-top: 0.25em;
  margin-bottom: 0;
}

td .task-checkbox,
th .task-checkbox {
  margin-right: 0.45em;
}

/* ------------------------------------------------------------
   Tables — booktabs
   ------------------------------------------------------------ */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 9pt;
  line-height: 1.65;
  border-top: 1.6px solid var(--rule-strong);
  border-bottom: 1.6px solid var(--rule-strong);
}

thead {
  display: table-header-group; /* repeat header on page breaks */
}

thead th {
  font-size: 8.4pt;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink);
  padding: 8px 12px 7px;
  border-bottom: 0.8px solid var(--ink);
  text-align: left;
  vertical-align: bottom;
}

tbody td {
  padding: 6.5px 12px;
  border-bottom: 0.5px solid var(--rule);
  vertical-align: top;
}

tbody tr:last-child td {
  border-bottom: none;
}

tr {
  break-inside: avoid;
}

table code {
  font-size: 0.92em;
}

/* ------------------------------------------------------------
   Code blocks
   ------------------------------------------------------------ */
.code-block {
  margin: 1.4em 0;
}

.code-block[data-lang]::before {
  content: attr(data-lang);
  display: block;
  text-align: right;
  font-family: var(--mono);
  font-size: 6.6pt;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--faint);
  margin-bottom: 3px;
}

pre {
  margin: 0;
  background: var(--paper);
  border: 0.5px solid var(--paper-line);
  border-radius: 2px;
  padding: 13px 16px;
  font-family: var(--mono);
  font-size: 8.2pt;
  line-height: 1.62;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: hidden;
  font-variant-ligatures: none; /* keep code characters verbatim (no -> ligatures) */
}

pre code {
  background: none;
  border: none;
  color: var(--soft);
  padding: 0;
  font-size: 1em;
  border-radius: 0;
}

/* highlight.js — desaturated print palette */
.hljs-comment, .hljs-quote { color: #8f8b84; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-meta { color: #5b4a78; }
.hljs-string, .hljs-regexp, .hljs-addition { color: #56713f; }
.hljs-number, .hljs-literal, .hljs-symbol, .hljs-bullet { color: #9c5a2e; }
.hljs-title, .hljs-section, .hljs-name,
.hljs-title.function_, .hljs-title.class_ { color: #35506e; font-weight: 600; }
.hljs-attr, .hljs-attribute, .hljs-variable,
.hljs-template-variable, .hljs-selector-attr { color: #7a5523; }
.hljs-type, .hljs-built_in, .hljs-builtin-name,
.hljs-selector-class, .hljs-selector-id { color: #3f6b66; }
.hljs-deletion { color: #8a3b34; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }

/* ------------------------------------------------------------
   Images
   ------------------------------------------------------------ */
.image-wrapper {
  display: block;
  margin: 1.8em auto;
  text-align: center;
  break-inside: avoid;
}

.image-wrapper img {
  max-width: 100%;
  height: auto;
}

.image-size-small img { max-width: 300px; }
.image-size-medium img { max-width: 480px; }
.image-size-large img { max-width: 100%; }
.image-size-original img { max-width: 100%; }

figcaption {
  margin-top: 0.9em;
  font-size: 8.3pt;
  letter-spacing: 0.02em;
  color: var(--muted);
}

/* ------------------------------------------------------------
   Print flow control
   ------------------------------------------------------------ */
.image-wrapper, .toc, blockquote {
  break-inside: avoid;
}

h1, h2, h3, h4 {
  break-after: avoid-page;
}

/* ------------------------------------------------------------
   MarkNotes compat — native checkbox inputs (renderer emits
   <input type=checkbox> rather than md2pdf's .task-checkbox span)
   ------------------------------------------------------------ */
li.task-list-item > input[type='checkbox'] {
  width: 11px;
  height: 11px;
  margin: 0 0.6em 0 0;
  vertical-align: -1px;
  accent-color: var(--ink);
}
`
