# Agent instructions

## Meta-rule

**ALWAYS look for the existing pattern before writing anything new.** This repo is highly consistent; new code should mirror the closest existing example, not invent shape. Search first, code second.

## Scope

- **Minimal diff.** Prefer the smallest change that satisfies the request — don't refactor unrelated code, rename identifiers "on the way", or restructure imports beyond the diff.
- If the task drifts, ask before expanding scope.

## Stack

AdonisJS 7 (session + Lucid), Inertia + React 19, Tailwind 4 + shadcn/Radix, Postgres 16, pnpm monorepo (Turbo).

## Commands

- `pnpm dev` — dev server
- `pnpm test` — full suite
- `pnpm typecheck && pnpm lint` — before saying "done"
- `pnpm infra:up` — Postgres via compose (port 54350)
- `pnpm ace <cmd>` — Adonis CLI from the repo root (shortcut for `pnpm --filter web exec node ace <cmd>`)
- `pnpm ace make:module <name> [--db] [--i18n] [--events]` — scaffold a module and wire every touchpoint (alias, preload, migration path, tsconfig include, i18n loader)

## Done criteria

Before reporting completion:

- Run `pnpm typecheck && pnpm lint`.
- Run the narrowest relevant test first (module functional spec) before falling back to `pnpm test`.
- If a required command failed to run (missing infra, no network, etc.), stop and report the failure with the relevant output — do not claim completion.

## Architecture — module per bounded context

Every bounded context lives at `app/<mod>/` as a self-contained module. A module owns the ubiquitous language of one context and may hold multiple aggregates inside — modules are **not** 1:1 with aggregates. Existing modules: `tree`, `common`, `core`. Each module dir is aliased as `#<mod>/*` in `apps/web/package.json` → `"imports"` — see the `module-scaffolding` skill to add one.

```
app/<module>/
  controllers/        # thin: validate → service → redirect/render
  services/           # one class per aggregate, its reads + writes as methods — <aggregate>_service.ts
  policies/           # extend BasePolicy, one per resource
  models/, mixins/, exceptions/, enums/
  middleware/         # singular — HTTP middleware (registered in start/kernel.ts)
  transformers/
  validators/         # one file per entity — validators/users.ts, validators/roles.ts
  database/{factories,migrations,seeders}/
  resources/lang/     # i18n JSON, per module per locale
  ui/                 # Inertia pages + React components
  mails/              # BaseMail classes — *_notification.ts (see the mail skill)
  notifications/      # Notification classes (if the module emits)
  types/              # <aggregate>_service.ts (service inputs/filters/results) + events.ts (EventsList merge)
  listeners/          # @inject() listener classes that need a service
  start/{events,view}.ts
  routes.ts
  tests/{unit,functional}/
```

### Services + dependency injection

All business logic (reads and writes) lives in services: one class per aggregate, operations as public methods (`UserService.create`, `RoleService.list`). Their input types live in `types/<aggregate>_service.ts`, never in the service file. Consumers — controllers, middleware, listeners, other services — receive services through `@inject()` + constructor; never `new XService()`. Tests resolve them with `app.container.make(XService)`. See the `services-events` skill.

### Dependency direction

Feature modules (`tree`) depend only on `common`, `core`, and themselves. Don't introduce a new feature→feature dependency without adding it here first.

### Naming is wiring

Two conventions the tooling enforces silently — get the name wrong and there's no error, just a missing entry:

- **Filename globs feed the typed registries.** `*_controller.ts` and `*_transformer.ts` are indexed by `indexEntities` into `#generated/controllers` and the shared-props types. A different suffix is silently absent from the registry.
- **Transformer variants are named `for<Screen>`** — `forList`, `forEdit`, `forProfile`, `forSharedProps` — over a `toObject()` base, consumed as `Transformer.transform(x).useVariant('forEdit')`. See `app/users/transformers/user_transformer.ts`.

## Skills — where the detailed workflows live

Detailed conventions live as agent skills in `packages/skills/`, in the [Vercel Skills](https://github.com/vercel-labs/skills) format. Install with `npx skills add ./packages/skills --agent claude-code` (or `--all`). **Prefer loading the relevant skill over guessing** — every skill has repo refs to canonical examples and external doc links. Only the invariants below need to hold when a skill isn't loaded.

**Backbone**

- `module-scaffolding` — bootstrap a new `app/<mod>/` via `node ace make:module` (wires alias + preload + migration paths + tsconfig include).
- `crud` — full stack (route → controller → validator → policy → service → transformer → Inertia page).
- `routes` — resource vs. verb routes, numeric matchers, naming.
- `queries` — read side: list methods + per-concept read models, as service methods composed in the controller.
- `services-events` — service shape (one per aggregate, `@inject()` only) and event-driven side effects.
- `testing` — Japa functional + unit patterns (transactions, fakes, sinon, factories).

**Frontend**

- `inertia` — page resolver, shared props, `useForm`, `urlFor`, modals, provider tree.
- `i18n` — three locales, `useTranslation()`, `ctx.i18n.t()`, `User.locale` persistence.
- `layout-shells` — four coexisting shells; pages import explicitly, no runtime toggle.

**Feature**

- `authorization` — `PERMISSIONS` catalog + DB-backed roles (CRUD at `/roles`) + `WithRoles` + Bouncer policies + `useCan()` + escalation/lockout guards.
- `mail` — `BaseMail` classes + MJML via `@email.layout` + `mailContext()`.
- `attachment` — `@jrmc/adonis-attachment` converters + model decoration + `preComputeUrls`.
- `migrations` — starter kit convention: edit existing `create_<table>` migrations + `migration:fresh` instead of layering `alter_table`.

**Git**

- `git-commit` — commit types, scopes, examples, safety protocol.

## Code style

- Comments only for non-obvious WHY — a hidden constraint, subtle invariant, workaround. Don't narrate what the code does.
- Don't create README / doc files unless the user asks for them.
- Prefer editing existing files over creating new ones.

## UI layers — which to import

Two tiers, by design (not duplication):

- `@workspace/ui/*` (`packages/ui`) — **headless primitives** (shadcn/Radix): `Field`, `FieldError`, `toast`, buttons, tables. No app or Inertia knowledge.
- `#common/ui/*` — **Inertia-aware composition** that wraps the primitives: `Form`/`Field`/`FieldError` bind form errors via `FormErrorsContext` + `FieldNameContext`; `useFlashToasts` pipes Inertia flash into the primitive `toast`.

Rule: inside Inertia pages/forms import from `#common/ui`; reach for `@workspace/ui` directly only for a primitive that has no app wrapper. Add new primitives to `packages/ui`, new app-composition to `#common/ui`.

## Git — non-negotiables

Full workflow: `packages/skills/git-commit/SKILL.md`. Rules every agent must respect even without the skill loaded:

- **Never** `--no-verify`, `git push --force`, `git reset --hard`, or amend a pushed commit.
- **Never** commit or push without being asked.
