---
"@flama/api": patch
---

Better Auth trusts the phone app's deep-link scheme only when `MOBILE_SCHEME` is set. It used to trust `flama://` on every deployment by default, and a custom scheme belongs to nobody: on Android any installed app can register it and be handed the redirect that carries a session. A deployment no phone app signs in to now trusts no app scheme; one that sets `MOBILE_SCHEME` to something that is not a URL scheme, or to a web scheme such as `https`, refuses to boot. The root `.env.example` keeps `MOBILE_SCHEME=flama` for local development.
