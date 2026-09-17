---
"@flama/frontend-web": minor
"@flama/web": minor
"@flama/admin-web": minor
---

Stop paying for render coupling the React Compiler was hiding, and check the two
rules that let it in.

`DataTable` was one 624-line component holding the search field, the selection,
every row and the pager, so a keystroke re-rendered all of them — measured, eight
rows per character, for a query that was debounced anyway and had not been asked
yet. It is now a shell over a header, a body, a row, a footer and a search field
that keeps the half-typed word itself and commits once per burst. `useTableQuery`
loses its own debounce and an effect with it; `search` and `searchQuery` are both
the settled value.

The api-tokens screen and the admin-users screen each subscribed to a query so
that one sibling below them could render the result, and `CreateTokenCard`
forwarded three props it never read. Each query now lives in the section,
dialog or table that renders it. `PermissionPicker` held one flat `Scope[]` for
eleven groups, so granting one re-rendered thirty-three toggles; each row takes
its own field off the form now — 33 renders per click down to 3 with the
compiler off, which is where the structure is actually visible.

`pnpm check:structure` grew three checks that fail all of the above: a query
handed to its only consumer, a prop that is only forwarded, and a component past
its size cap (screens 180, sections 150, kit components 250). `*-render.spec.tsx`
files run in a second vitest project with the compiler switched off, so a
regression shows up as a failing assertion rather than as nothing at all.
