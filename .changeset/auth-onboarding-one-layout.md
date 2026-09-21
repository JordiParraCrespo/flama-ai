---
"@flama/web": patch
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
themselves: `_auth/_public.tsx` turns signed-in visitors away, `_auth/onboarding.tsx`
turns signed-out ones away, and `_auth/accept-invitation.tsx` carries no guard
because both are legitimate there. Where a route sits is the answer, so the
`allow` exception is gone — it could drift from the path it named, and this
cannot.

The onboarding screen had hand-rolled the auth column: the same padding, the
same theme toggle in the same corner, the same 400px measure. It renders in
the real layout now and its wrapper is a fragment.

Every URL is unchanged — `/login`, `/register`, `/forgot-password`,
`/reset-password`, `/accept-invitation` and `/onboarding` all resolve exactly
as before.
