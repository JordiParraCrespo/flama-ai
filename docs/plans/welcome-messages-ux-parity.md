# Welcome Messages — UX parity plan

Goal: rebuild the "Welcome Messages" automation screen (target = screenshot 1,
light "Miranda" UI) so the current implementation (source = screenshots 2–3,
dark "AnitaWolf" UI) matches it 100 % in structure, hierarchy, copy, states and
interaction. Every item below is a concrete, checkable difference.

## Reference assets

The plan and its acceptance checklist are defined against three screenshots.
Commit them next to this document so implementers can verify spacing, states
and copy without the original thread:

| File | Content |
|------|---------|
| `docs/plans/assets/welcome-messages/target-auto-sequence-disabled.png` | Target UI (light, "Miranda ✨"): Auto Welcome Sequence tab, sequence disabled, empty step list, "Send to a fan" card with its empty-state hint |
| `docs/plans/assets/welcome-messages/source-of-welcome.png` | Current UI (dark, "AnitaWolf"): OF Welcome tab, warning banner, enabled switch, message + 1 attachment, Edit Template / Delete |
| `docs/plans/assets/welcome-messages/source-auto-sequence.png` | Current UI: Auto Welcome Sequence tab, two 2-min steps with Edit / Move up / Move down / Remove, Add Step, cancel checkbox, Save Sequence |

The gap table below transcribes every visible element from them, so the
document is self-contained for copy and structure; the images are still
required for the pixel-level checks in section 8.

## 0. Gap inventory (source → target)

| # | Area | Source (current) | Target (reference) |
|---|------|------------------|--------------------|
| 1 | Page chrome | Standalone page, creator picker top-right (`AnitaWolf ▾`) | Lives inside app shell: hamburger + breadcrumb `Chatting › Miranda ✨ › Automations`, global search (⌘K), SFW toggle, theme toggle, notifications badge |
| 2 | Section nav | None | Horizontal underline tabs above the page: Welcome Messages · AI Mass Messages · AI PPV Follow-up · AI Poke · Auto Follow · Tracking Links |
| 3 | Page title | Yellow envelope icon + "Welcome Messages" (H1, full width) | Blue chat-heart icon + "Welcome Messages", centred column (~1340 px max) |
| 4 | Sub-tabs | Underline tabs (`OF Welcome` / `Auto Welcome Sequence`) | Segmented pill control (`Tabs` default variant): inactive = muted text, active = white pill with subtle ring |
| 5 | Warning banner | Amber `Alert` "Both OF native welcome and the auto welcome sequence are active…" always shown when both enabled | Not present in the target screenshot. Keep behaviour but render it only when both are enabled (target shows disabled state) |
| 6 | Card header | Bold title "Auto Welcome Sequence" + right-aligned `Enabled` label + amber switch | Leading list icon (blue) + **state-driven title** ("Sequence disabled" / "Sequence enabled") + description on the same block; bare `Switch` (no label) right-aligned, top |
| 7 | Card description | "Define a multi-step message sequence sent via the CRM…" | "A multi-step message sequence sent via the CRM after a fan subscribes. Each step can include text, media, price, delay, and conditional logic." |
| 8 | Step list | Dark nested cards `Step 1 · 2 min`, text, then `Edit · Move up · Move down · Remove` | Same list, but on light nested cards with `border-subtle`, `radius-card`; actions as ghost buttons; disabled move buttons at ends |
| 9 | Add step | Text link `+ Add Step` (ghost) | Outlined secondary `Button` `+ Add Step`, `radius-nav` |
| 10 | Cancel checkbox | Same copy, amber check | Same copy, `accent-blue` `Checkbox` |
| 11 | Save CTA | Amber filled "Save Sequence" | `accent-blue` filled "Save Sequence" |
| 12 | Second card | Absent | New card **Send to a fan**: paper-plane icon, description "Send one step or the whole sequence to a fan as real OnlyFans DMs, routed through the paced outbound queue.", body "Save a step first to send it to a fan." when there are no saved steps; otherwise fan picker + step/whole-sequence send controls |
| 13 | Theme | Hard-coded dark, amber accent | Token-driven (`--surface-canvas`, `--accent-blue`, `--ink-*`); works in light *and* dark via `data-theme` |
| 14 | Typography | Larger (title ~32 px) | `--text-24` title, `--text-14` body, `--text-13` muted |

## 1. Shell & navigation (gaps 1–2)

1. Route: `apps/web/src/routes/_authenticated/chatting/$creatorId/automations/welcome.tsx`
   (TanStack file route). Sibling routes for the other five tabs can be stubs.
2. Layout route `automations.tsx` renders:
   - `Breadcrumb` (`design-system-web/breadcrumb`) → `Chatting / {creator.name} / Automations`.
   - Section `Tabs variant="line"` bound to the child route (`useMatchRoute`), full-width, sticky under the header.
3. Header chrome. Today `_authenticated.tsx` renders only a `SidebarTrigger`
   and a `Separator`; there is no global search, SFW switch, theme toggle or
   notifications control anywhere in `apps/web`. Build them once, in the shell
   header (not inside the page), so every automation tab inherits them:
   - Global search: `SearchInput` + `Kbd` "⌘K" opening a `Command` palette.
   - SFW switch: `Switch` with `aria-label="Safe for work"` and a visible
     "SFW" caption, persisted in a Zustand store in `packages/frontend`.
   - Theme toggle: `IconButton` (sun/moon) wired to the existing
     `ThemeProvider` (`theme-provider.tsx`).
   - Notifications: `IconButton` (bell) + `Badge` count ("9+" cap) fed by a
     `useUnreadNotifications` hook; the drawer itself can be a stub.
   The creator selector moves from the page to the breadcrumb (creator segment
   is a `DropdownMenu`).

## 2. Page header & sub-tabs (gaps 3–4)

1. Centred content column: `mx-auto w-full max-w-[1340px] px-6 py-8`.
2. Title row: `AppIcon`/lucide `MessageSquareHeart` in `text-[--accent-blue]` +
   `h1` at `--text-24`, `font-semibold`.
3. Sub-tabs: `Tabs` **default** variant (`TabsList` pill + `TabsTrigger`) with
   values `of-welcome` | `auto-sequence`; persist the active tab in the URL
   search param `?tab=` so deep links work like the reference.

## 3. Auto Welcome Sequence card (gaps 5–11)

1. `Card` with `CardHeader` in a 3-column grid: icon | title+description | `Switch`.
   The switch has no visible label, so it must carry an accessible name:
   `aria-labelledby` pointing at the card title id (or
   `aria-label={t('automations.welcome.sequence.toggleLabel')}`). Same rule for
   the OF Welcome switch (section 5), so the two controls are distinguishable
   to screen readers.
2. Title is derived, not static:
   `t(enabled ? 'automations.welcome.sequence.enabledTitle' : '…disabledTitle')`
   → "Sequence enabled" / "Sequence disabled". Toggling the switch flips the
   title instantly (optimistic), then persists.
3. Description copy replaced verbatim (gap 7). All copy goes to
   `packages/translations/{en,es}/index.json` under `automations.welcome.*`.
4. Warning banner: keep `Alert variant="warning"`, render only when
   `ofWelcome.enabled && sequence.enabled`. Place it *above* the card, inside
   the column, like the current source.
5. Step editor:
   - Empty state = just the `+ Add Step` outlined button (reference).
   - Steps render as nested `Card`s (`bg-[--surface-sunken]`, `border-subtle`),
     header `Step {n} · {delay}`; actions `Button variant="ghost" size="sm"`
     for Edit / Move up / Move down, `variant="ghost"` + destructive text for Remove.
     Move up disabled on first, Move down disabled on last.
   - Form state: single React Hook Form `useFieldArray('steps')` validated by a
     new `welcomeSequenceSchema` in `packages/shared/src/schemas/automations/`
     (no message strings; add any new `validation.*` keys to `createZodErrorMap`
     + both locales per `.agents/rules/forms.md`).
6. `Checkbox` "Cancel auto-unsend if fan replies" bound to `cancelOnReply`.
7. Primary `Button` "Save Sequence" (`accent-blue`), disabled while pristine or
   submitting; success toast via `sonner`.

## 4. "Send to a fan" card (gap 12)

1. Second `Card` beneath the sequence card, same width.
2. Header: paper-plane icon (`Send`) + title "Send to a fan" + description
   (copy verbatim from reference).
3. Body states:
   - No **saved** steps → muted paragraph "Save a step first to send it to a fan."
   - Saved steps → `AsyncMultiSelect`/`SearchInput` fan picker, a `Select`
     "Step 1 · … / Whole sequence", and a `Button` "Send". On send: call the
     API, toast "Queued", keep the card in place.
4. Gating uses the *persisted* sequence, not the unsaved form, so adding a step
   without saving still shows the hint (matches reference).

## 5. OF Welcome tab (from screenshot 2, restyled)

Same card anatomy as section 3: icon | "OF Welcome Message" + description |
`Switch`. Body: message text, `Attachment` thumbnails with "N files" caption,
then `Button variant="outline"` "Edit Template" and ghost-destructive "Delete".
Amber → blue accent, dark hard-codes → tokens.

## 6. Theming & tokens (gaps 13–14)

1. Remove every hard-coded colour (`#0b0c0f`, amber `#f5c542`, etc.) in the
   source; replace with `bg-[--surface-canvas]`, `bg-card`, `text-[--ink-600]`,
   `border-[--border-subtle]`, `text-[--accent-blue]`.
2. Verify both `data-theme="light"` and `"dark"` render correctly (the
   reference is light; the dark theme must simply follow tokens).
3. Radii: cards `--radius-card` (16 px), buttons/inputs `--radius-nav` (8 px),
   segmented tabs `--radius-pill`.

## 7. Data layer (`packages/frontend`)

- `domain/automations/welcome-sequence.entity.ts` (steps, enabled, cancelOnReply).
- Repository port + `api-client` adapter; hooks `useWelcomeSequence(creatorId)`,
  `useSaveWelcomeSequence`, `useToggleWelcomeSequence`, `useSendWelcomeStep`.
- API (`apps/api`) module `welcome-sequences` via `/scaffold-module` if the
  endpoints do not exist yet, with Swagger decorators, then
  `pnpm generate:api-client`.
- Authorization on every endpoint (read, save, toggle, send), per
  `.agents/rules/rbac-roles.md` and `scopes-and-credentials.md`:
  - `@UseGuards(AuthGuard, PoliciesGuard)` + `@CheckPolicies({ action, subject: 'WelcomeSequence' })`
    (`read` for GET, `update` for save/toggle, `create` for send) so
    browser-session requests are governed by the user's roles.
  - `@RequireScopes` with matching scopes (add `automations:read` /
    `automations:write` / `messages:send` to the scope catalog in
    `packages/shared/src/scopes/`) so API tokens and MCP clients are
    intersected with the same rules.
  - Creator ownership check in each handler: resolve `creatorId` from the
    route, load the creator, and reject (404 via `AppError`) unless it belongs
    to the caller's organization / is in `request.ability`'s resource scope.
    Never trust a creator id from the body. "Send to a fan" additionally
    verifies the fan belongs to that creator before enqueueing.

## 8. Verification checklist (definition of "100 %")

- [ ] Side-by-side screenshot at 2000 px width matches the reference pixel
      structure: breadcrumb, section tabs, title, segmented tabs, two cards.
- [ ] Toggle off → title "Sequence disabled"; on → "Sequence enabled".
- [ ] No saved steps → "Save a step first to send it to a fan." visible.
- [ ] Both toggles on → amber warning banner appears on both sub-tabs.
- [ ] Move up/down disabled at list ends; Remove updates numbering.
- [ ] `?tab=auto-sequence` deep link opens the correct sub-tab.
- [ ] Light and dark themes both pass a visual check.
- [ ] `pnpm check`, `pnpm test`, and typed `t()` compile in `en` + `es`.

## 9. Suggested sequencing

1. Tokens/theme cleanup + card anatomy (sections 3, 5, 6) — biggest visual delta.
2. Sub-tabs + page header (section 2).
3. "Send to a fan" card (section 4).
4. Shell: breadcrumb + section tabs (section 1).
5. Data layer + API wiring (section 7), then the checklist (section 8).
