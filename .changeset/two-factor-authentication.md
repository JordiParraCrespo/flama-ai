---
"@flama/api": minor
"@flama/auth": minor
"@flama/frontend-core": major
"@flama/frontend-consumer": minor
"@flama/frontend-web": minor
"@flama/frontend-mobile": minor
"@flama/shared": minor
"@flama/translations": minor
"@flama/design-system-web": minor
"@flama/api-client": patch
"@flama/web": minor
"@flama/mobile": minor
---

Two-factor authentication: Better Auth's `twoFactor` plugin (an authenticator app plus single-use backup codes), optional per user. The `AddTwoFactor` migration adds `user."twoFactorEnabled"` and the `twoFactor` table, and the profile reports the enrolment. A password sign-in on an account with it on rejects with `TwoFactorRequiredError`, which the web and mobile login screens answer with a code step (`TwoFactorChallengeForm` in each kit, `useVerifyTwoFactor`). The web profile sets it up behind the switch that was read-only, with a QR code, and turns it off or replaces the backup codes. `IAuthClient` gains `verifyTwoFactor`, `enableTwoFactor`, `confirmTwoFactor`, `disableTwoFactor` and `generateBackupCodes`, so every app's client implements them. `TWO_FACTOR_ISSUER` names the account in authenticator apps.
