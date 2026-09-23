---
"@flama/web": patch
"@flama/frontend-web": minor
---

Put everything before the console under one `_auth` layout, and let each route
say for itself who may reach it.

`_auth` used to be chrome *and* a gate: it mounted `AuthLayout` and called
`redirectSignedIn`, so every route beneath it had to be a signed-out route.
Two things did not fit. `accept-invitation` is reachable by a signed-out
invitee *and* a signed-in one, which the guard handled with an exception —
`allow: ['/accept-invitation']`. And `/onboarding`, which only a signed-in
account should see, could not live under that layout at all, so it sat outside
with its own copy of the layout's chrome.

Now `_auth` renders and guards nothing, and its three children each answer for
themselves: `_auth/_public.tsx` turns signed-in visitors away,
`_auth/onboarding.tsx` turns signed-out ones away, and
`_auth/accept-invitation.tsx` carries no guard because both are legitimate
there.

**`redirectSignedIn` drops its `allow` parameter.** An exception list beside a
guard is a second copy of the tree and can drift from the paths it names; a
route both readers may open belongs under a parent that guards nobody, which
cannot. Nothing passed `allow` any more, and leaving it exported is how the
next route that "does not fit" gets appended to it instead of placed.

**`redirectSignedOut` joins it**, so the pair is symmetric. Three routes had
each written the signed-out bounce inline — both apps' `_authenticated` and
the onboarding step — and with it the `/login` target and the reason it sends
`location.href` rather than `location.pathname`. Now a route picks one guard,
the other, or neither.

The onboarding screen had hand-rolled the auth column: the same padding, the
same theme toggle in the same corner, the same 400px measure. It renders in
the real layout now and its wrapper is a fragment.

Every URL is unchanged — `/login`, `/register`, `/forgot-password`,
`/reset-password`, `/accept-invitation` and `/onboarding` all resolve exactly
as before.
