---
paths:
  - "apps/web/**/*"
  - "apps/admin-web/**/*"
  - "apps/mobile/**/*"
  - "apps/admin-mobile/**/*"
  - "apps/extension/**/*"
  - "packages/frontend/**/*"
---

# Client State: Failures, Races and Live Data

The bugs that hide in a client: a failure drawn as an empty screen, a draft
lost to a failed send, a late response putting old data back, a list that
never hears about a change. Which component draws a failure is
`frontend-ui.md`; this file is what the state behind it must do. Prove each
rule with a test that makes the request fail, arrive late or arrive from
elsewhere.

## A failure never looks like an answer

- **A read that fails is never drawn as empty, "not found" or a blank
  table.** It shows the failure with a way to try again. A query has three
  states (pending, error, data), and a screen with an `isError` it never
  draws is the bug, on the web apps and the phone apps alike.
- **A write that fails keeps what the person typed.** A form or a composer
  clears its input optimistically only if `onError` puts it back, unless the
  person has typed something new since. The error shows beside the input
  with a way to submit again.
- **A send while the device is offline is refused visibly, never dropped.**
  The control knows the connection state and disables or queues, saying
  which.
- **A partial failure is reported, not swallowed.** A bulk action over
  several rows (invite five people, remove three members) shows which ones
  failed; an update that failed halfway refreshes what it touched.
- **A background write the person never sees (mark read, record a last-seen
  time) is retried on the next chance**, not given up after one failure. A
  retry after a lost response checks whether the first attempt landed before
  failing on a precondition that attempt changed.

## A late answer never wins

- **A mutation cancels the reads it is about to replace.** In `onMutate`,
  `queryClient.cancelQueries` on the keys it writes, so a read already in
  flight cannot land after the mutation and put the old value back.
- **A save applies only if it is still the latest.** Two saves of the same
  thing (a reorder, then another reorder; a toggle flipped twice) can answer
  out of order; keep a sequence or compare with the snapshot the save started
  from, and drop the stale answer. An edit dialog compares the person's edits
  with the snapshot it opened on, not with what has loaded since.
- **A refetch never changes what the person is acting on.** The target of a
  pending confirm (remove this member, revoke this role) is held by id from
  the moment it was shown, not re-read from the list position.
- **An optimistic id swapped for the stored one keeps the item's UI state**
  (animation, selection, focus): key it by a client id that survives the swap.

## Data other people change arrives without a reload

- **A list another person or device can change says how it hears about the
  change**: a live feed it subscribes to, where the product has one, or a
  refetch on focus, on reconnect or on an interval. A screen that reads once
  and never refreshes is stale for as long as it is open; a mutation
  invalidates every query key that shows what it changed, not only the one
  on screen.
- **State kept per device in `localStorage` listens to the `storage` event**,
  so every open tab agrees.
- **An indicator built from a live feed says when the feed is down.** A
  badge that reads a cache the feed fills goes stale silently when the
  connection drops; refetch on reconnect, or mark it unknown.
- **Every viewer of a shared object hears its change.** When one person
  changes an organization's name or a member's role, the other open screens
  that show it are told too.

## Selection and visibility agree

- **Rows hidden by a filter or a search leave the selection**, or come back
  unselected. A bulk action never touches a row the person cannot see.
- **A marquee or a select-all takes only what the person can see**: the
  current page and filter, inside the scroll container's visible box.
- **A filter that hides finished items keeps what the person just
  finished** until they leave, so the row they acted on does not vanish under
  the pointer.

## Layout holds at every width, and every control has focus

- **Check each screen at 390, 500 and 900 pixels wide** as well as the
  desktop width: long text (a name, an email, a translated label) truncates
  or wraps instead of overlapping the next column, and nothing sits behind a
  mobile tab bar or outside the safe area.
- **A component that removes the outline draws its own `focus-visible`
  ring**, and so does every button built on it.
- **A press inside a draggable row does not start the drag** when it lands
  on a control of its own.
- **A list of options exposes the active one to screen readers**
  (`aria-activedescendant` on the input that owns the list).
