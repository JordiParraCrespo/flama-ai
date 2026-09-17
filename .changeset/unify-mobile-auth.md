---
"@flama/design-system-mobile": minor
"@flama/frontend-mobile": minor
"@flama/mobile": minor
"@flama/admin-mobile": minor
"@flama/mobile-showcase": patch
---

Give the Expo apps the same sign-in screens as the web apps.

Mobile sign-in was the one surface the Alpaca Labs rebrand never reached. Login
had been half-converted — a wordmark, a theme pill and a 3xl heading written
inline in the screen and copied verbatim into `apps/admin-mobile` — while
register, forgot-password and reset-password were still a shadcn `Card` floating
in the middle of the viewport. None of it shared a line with
`@flama/frontend-web`, so the two platforms had drifted into two designs.

The chrome now lives in one place: a new **`auth` concern in
`@flama/frontend-mobile`**, the mobile half of the web kit's concern of the same
name, with the same exports and the same type ramp — `AuthLayout`, `BrandLogo`,
the `Auth*` primitives (title, subtitle, eyebrow, icon circle, email chip, note,
divider, back link, footer note, inline form error), `PasswordInput`,
`PasswordRequirements`, `PasswordChecklist`, `SocialLoginButtons` and the
provider marks. `theme` gains `BrandGlyph` and the `ThemeToggle` pill; `forms`
gains `useErrorMessage`. `auth` is the kit's first `top` concern, since it is
the one that composes `theme`, `forms` and `i18n`.

What that changes on screen, in both Expo apps:

- Every auth screen wears the same frame — wordmark and theme pill on top, the
  form in a 400px column, the language switch and the legal note at the foot —
  instead of three of them rendering a centred card.
- The type ramp matches web exactly: a 24px/500 title over a 14px `ink-600`
  subtitle, 13px labels, `ink-*` and `accent-blue` in place of `text-blue-500`
  and the `muted-foreground` stand-ins.
- **Failures render inline above the first field** rather than in a native
  `Alert.alert` that buried the error behind a dismissal, and they are resolved
  through `useErrorMessage`, so a Spanish reader no longer gets the API's
  English `detail`.
- Password fields have the reveal toggle and the live rule checklist that gates
  the submit button, register asks for a password the API will actually accept,
  and reset-password confirms it twice.
- Social sign-in is driven by `GET /health/capabilities` with web's failure
  semantics, is stacked full-width with the real Google and GitHub marks, and
  surfaces a failed round-trip instead of leaving a button that stopped
  spinning.
- Forgot-password and reset-password gained web's terminal states: the
  mail-sent panel with "try another email", the invalid-link panel, and the
  password-updated panel.

`@flama/design-system-mobile` ships **`BrandMark`**, the eight-arm asterisk the
web package already had, so the wordmark is the real mark rather than Lucide's
`Asterisk`; the `--theme-toggle-*` tokens the three mobile token files already
carried are now mapped into the NativeWind theme. The `(auth)` stack layouts
take their background from `THEME` instead of a hand-written `hsl(0 0% 3.9%)`
that had drifted from the dark canvas token.
