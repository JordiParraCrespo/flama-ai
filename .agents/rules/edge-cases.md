---
paths:
  - "apps/api/**/*"
  - "apps/web/**/*"
  - "apps/admin-web/**/*"
  - "apps/mobile/**/*"
  - "apps/admin-mobile/**/*"
  - "apps/extension/**/*"
  - "packages/shared/**/*"
  - "packages/backend/**/*"
  - "packages/frontend/**/*"
---

# Edge Cases

Most bugs are not in the main path. They come from an input nobody tried, a
limit somebody else owns, or a name used as an identity. Prove each rule
below with a unit test at the owner boundary that feeds the breaking input;
a review that says "covers X" points at that test.

## Text is code points, and storage has rules

- **Cut on code points, never on UTF-16 units.** `text.slice(0, n)` can split
  an emoji's surrogate pair, and Postgres `jsonb` and `text` refuse a lone
  surrogate. Use `Array.from(text).slice(0, n).join('')`, or
  `Intl.Segmenter` when a grapheme must survive whole. A cut that has to fit
  a budget leaves no fragment of a marker behind (half an ellipsis, half a
  tag), and does not drop the text after it.
- **Text bound for Postgres has NUL (`\u0000`) stripped before it is
  written**, on every path that writes it: request bodies, webhook payloads,
  file names from an upload, an upstream API's response. Postgres refuses the
  row otherwise. One normaliser per module, called by every writer.
- **Offsets survive case folding only when the folding keeps the length.**
  `'İ'.toLowerCase()` is two code units, so a range built on the folded
  string (a search highlight) lands past the end of the original. Fold one
  character at a time and keep a map back to the original index, or compare
  with `localeCompare`/`Intl.Collator` instead.
- **A transform over Markdown or markup leaves code alone.** Split out
  fenced blocks and inline code first, transform the rest, and put them back:
  an escape pass that turns `**` into `*` also turns `2 ** 3` into `2 * 3`.
- **Expanding a token inside text rewrites only the text the person typed**,
  never the inside of an earlier paste, a quoted reply or an attachment.
- **Line-oriented formats keep their last empty line.** `split('\n')` on a
  CSV, a patch or a log that ends in a newline gives a final empty element;
  dropping it changes counts and content.

## Keyboard input

- **Enter and the arrow keys do nothing while an IME is composing.** Check
  `event.nativeEvent.isComposing` (or `keyCode === 229`) before picking an
  option in a combobox or submitting a form. Japanese, Chinese and Korean
  input confirm with Enter.
- **Escape belongs to the surface that has focus.** A global Escape handler
  that closes a dialog or discards a draft also fires when a search field or
  a menu inside it is closing.

## Limits you do not own

Every limit between your code and the reader is part of your code. Look each
one up before writing the path that can reach it:

- the reverse proxy's body size (`client_max_body_size` in nginx, the
  platform's ingress): an upload can pass the API's own limit and still be
  refused before it reaches the API;
- the API's own page and batch caps, which a client must chunk to: a client
  that asks for one page of 100 and stops makes the hundred-and-first record
  unreachable;
- a vendor's message, file or rate limits (`integrations.md`).

A size cap on a stream (an upload, an upstream response) is enforced while
reading it, not after buffering it all. A walk over pages keeps what it has
read when a later page fails, and says it stopped short.

## Identity is an id

- **Match on an id, never on a name, a slug, an email, a label or the
  content.** An organization can be renamed, a slug reused after a delete,
  two people can share a display name, an email can change. Store the id at
  the moment the person chose, and compare ids.
- **Name the id you mean.** When an event carries several ids (the user, the
  organization, the membership, the invitation that created it), the log
  line, the job and the reply name the one the reader acts on.
- **"The latest" is not an id.** Code that resumes, retries or follows up on
  something targets it by its own id; picking "the most recent" row for the
  user can pick up another request's work.

## Heuristics fail safe, and are tested where they break

A proxy signal used to reject or classify input (a size, a length, a MIME
type from the header, a regex, a denylist) is tested against the inputs that
defeat the proxy, not only the ones that motivated it. A file's declared
`Content-Type` is not its content; `git -C dir push --force` hides the
subcommand from a parser that reads the second word. Write down which way the
heuristic fails, and make that the safe way: refusing a valid upload is
recoverable, accepting an executable as an image is not.

## Time and schedules

- **A schedule's next run is searched over a full cycle.** Cron with a
  day-of-month and a weekday can skip decades; search one Gregorian cycle
  (400 years) or prove it never fires.
- **What a schedule is said to do is computed by what runs it.** `*/25`
  fires at :00, :25 and :50, so "every 25 minutes" is wrong. Describe
  it from the same evaluator, or test the description against it.
- **Live state is never removed by age alone.** A sweep that deletes "stale"
  rows or files by wall-clock time removes the one still in use on a slow
  request or a sleeping device; check that nothing points at it.
- **Every timer and listener a hook or service starts is cleared when it is
  disposed** (`useEffect` cleanup, `onModuleDestroy`), and a heartbeat that
  must outlive a step is armed for the whole lifetime it watches.

## Removing, renaming and migrating

- **Before removing or renaming anything, search every consumer**, not only
  the package that owns it: the e2e specs, the skills' evals under
  `.agents/skills/`, the seed, the translations, the docs, and every app of
  both platforms. A spec that finds a field by its old placeholder, or a
  fixture that imports a deleted component, breaks far from the change.
- **Rows already stored keep working.** Removing a catalog entry (a scope, a
  permission, a role name) that saved records point at drops what they
  carried; a new column that a guard reads is backfilled or the guard
  handles `null`.
- **What mounts once at the root is checked at the root.** A provider, a
  portal host, a toaster, a query client: a new screen that needs one
  confirms the app's root mounts it, or every dialog it opens renders empty.

## Copy promises only what the code does

An empty state, an onboarding step, an email, a help page or a model's
system prompt describes only actions the routes can perform today: no
"Restore" for something that cannot be restored, no "Invite your team" where
the reader may not invite. A template refuses to send with an unfilled slot
instead of falling back to the placeholder.
