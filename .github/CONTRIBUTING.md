# Contributing

Thanks for taking the time. This file is the short version; the rules an
app or package holds its code to are in the `AGENTS.md` beside it, and the
repository-wide ones in the root [`AGENTS.md`](../AGENTS.md). They are
written for people and coding agents alike.

## Before you start

- **A bug**: open an issue with the bug form, unless it is a security
  vulnerability — those go privately, as [SECURITY.md](SECURITY.md) says.
- **A feature or a larger change**: open an issue first and agree the shape
  before writing it. A pull request that arrives with its design already
  settled is the quickest to review.
- **A new dependency** needs a reason in the pull request: what it does that
  the code we have cannot, and why it is worth carrying. A small one is
  often better inlined.

## Setting up

```bash
nvm use                 # Node 22, from .nvmrc
corepack enable         # pnpm, at the version package.json pins
pnpm install            # also enables the pre-push hook
cp .env.example .env    # the only env file; every variable has a note
pnpm docker:dev         # Postgres and Redis
pnpm dev
```

## Making the change

- Commits follow [Conventional Commits](https://www.conventionalcommits.org)
  with the scopes `commitlint.config.js` allows.
- A change to a package's behaviour carries a changeset: `pnpm changeset`.
- New API endpoints carry Swagger decorators and `@RequireScopes`, then
  `pnpm generate:api-client`.
- Tests sit beside the code they cover. A fix comes with the test that
  would have caught it.

## Before you push

```bash
pnpm ci:local
```

It is the pull request's Check job, run over what your branch affects, and
the `pre-push` hook refuses a commit it has not passed.

## The pull request

Fill in the template. Keep it to one concern; a refactor the change needed
can ride along, one it did not goes in its own pull request.

Reviews look harder at the paths [`CODEOWNERS`](CODEOWNERS) marks as
security-critical, so expect questions there.

## AI-assisted contributions

Welcome, on four conditions, the same ones whoever or whatever typed the
code:

1. **Disclosed** — say in the pull request what the tool did.
2. **Understood** — you can explain every line, and answer review on it.
3. **Tested** — automatically where it can be, by hand where it cannot.
4. **Yours to license** — nothing copied from code under an incompatible
   licence.
