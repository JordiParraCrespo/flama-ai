# Golden cases for the marker and JSON surgery

One file per case, holding the input, the edit and the output it must produce,
after Caddy's `caddyfile_adapt/*.caddyfiletest`. `scripts/lib/golden.test.mjs`
runs every `*.golden` file here, and `pnpm test:scripts` runs that.

```
about: what the case pins down, in one line
op: dropBlocks
removed: ["widget"]
=== input
...the text the edit runs on...
=== output
...what it must return...
```

- **Header.** `about` and `op` are bare text; every other value is JSON and
  is an argument of `op`. The ops and what each takes are the `OPS` table in
  the test: `dropBlocks` (`removed`, `whole`, `slots`), `narrowMarker`
  (`removed`) and `widenMarker` (`id`, `at`), which run on every line of the
  input, and the `json-text.mjs` edits (`path`, `literal`, `key`, `at`;
  `insertJsonEntry` takes its entry from an `=== entry` section).
- **Result.** `=== output` is the returned text; `=== at` follows it when the
  edit also reports a position (`deleteJsonValueAt`); `=== null` alone when
  the edit returns null.
- **Bodies.** A section ends at the next `===` line or the end of the file, and
  the newline before either belongs to the delimiter: a body that ends in a
  newline is written with a blank line under it.
- **Line endings.** The files are LF. `eol: "crlf"` runs the case on the input
  with CRLF line endings and expects CRLF back throughout.

Ids are made up (`widget`, `gadget`, `gizmo`): these files are skipped by
`pnpm starter:check`, and a real feature's name would only mislead.

## Adding or updating a case

Write the header and the input sections, then generate the result:

```bash
UPDATE_GOLDEN=1 node --test scripts/lib/golden.test.mjs
```

That rewrites the result sections of every case from what the code returns
now, so:

- **Never run it to make a failing case pass.** A failure is the code
  disagreeing with the contract; regenerating rewrites the contract to agree
  with the code. Fix the code, or, when the contract itself is changing, say
  so in the diff.
- **Read every output it regenerated** before committing it, not only the
  case you meant to touch: it rewrites them all, and a golden file records
  whatever the code returned.
- **JSON cases are also checked by parse.** For the value and entry edits, the
  test parses the output and requires it to equal the same edit made on the
  parsed input, so a regenerated file that keeps the bytes tidy but changes
  the meaning still fails.
