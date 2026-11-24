---
name: authorization
description: 'RBAC + Bouncer pattern in an AdonisJS + Inertia app. Capabilities live in a `PERMISSIONS` const; roles are DB rows managed from `/roles`; a `WithRoles` mixin composes into `User` to expose `hasPermission` / `hasRole` / `syncRoles`; `BasePolicy` subclasses gate routes; the frontend consumes a typed `useCan()` prop. Escalation is protected in depth. Use when adding a capability, gating a route, adding a policy, extending role logic, or reading `can` on the frontend. Trigger on: "add permission", "gate route", "policy", "useCan", "role", "RBAC".'
license: MIT
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# Authorization

Role-based access control implemented in plain code on top of AdonisJS Bouncer — no external RBAC library. Four moving parts:

1. **`PERMISSIONS`** — a const catalog of every capability the app understands.
2. **`Role` rows** — created/edited/deleted at runtime from `/roles`; each stores a subset of `PERMISSIONS`. One role is flagged `isDefault` (assigned on sign-up, preselected in user forms, never deletable).
3. **`WithRoles`** — a mixin composed into `User` that grants `assignRole` / `hasRole` / `hasPermission` / `syncRoles`.
4. **`BasePolicy` subclasses** — enforce `hasPermission(...)` at the controller.

On the frontend a typed `GlobalPermissions` object flows through Inertia's shared props and is consumed via `useCan()`. Adding a permission is a two-line change (`PERMISSIONS` const + wherever it's gated); adding a role needs no code — it's done in the UI.

## Rules

- **Single source of truth for capabilities** in a `PERMISSIONS` const object under the `users` module. Naming: `<mod>.<action>` (`users.create`, `roles.update`). Adding a permission = adding one entry + referencing it wherever it's gated. A new module's capabilities go in this **same** const — the `<mod>.<action>` naming already namespaces them; don't fork a second `PERMISSIONS`. One central catalog; the policies that consume it stay in each module.
- **Roles are data, never code.** No role name is referenced in `app/` — forms and filters send `roleId`, the UI lists roles from the DB (`RoleTransformer`). The seeder only bootstraps an initial `Admin` (all permissions) + default `Member`.
- **Roles store their own permissions** on the `Role` model as a JSON column (`role.permissions: Permission[]`), validated against `ALL_PERMISSIONS`. Role CRUD: `RolesController` + `RolePolicy` (`roles.*` permissions) + `CreateRole` / `UpdateRole` / `DeleteRole`.
- **`WithRoles` mixin** composes into `User` next to `withAuthFinder`. It exposes:
  - Mutations: `assignRole(role)`, `assignRoles(roles)`, `syncRoles(roles)`, `revokeRole(role)`, `revokeRoles(roles)`.
  - Checks: `hasRole(name)`, `hasPermission(permission)`.
  - Reads: `getRoleNames()`, `getPermissions()`, `preloadedRoles` (sync read of `.load('roles')`).
- **Policies** subclass `BasePolicy` and live at `app/<mod>/policies/<entity>_policy.ts`. One method per gated action. Signature: `currentUser` first, resource second when applicable. Return `boolean | AuthorizerResponse`.
- **Gate at the controller before validating**: `await bouncer.with(EntityPolicy).authorize('methodName', resource?)`. On deny it throws → 403 (JSON) or 302 back (HTML/Inertia). **Every mutation route (POST/PUT/PATCH/DELETE) must be gated by a Bouncer policy — no exceptions.**
- **Frontend shared prop**: an Inertia middleware computes a small `can: GlobalPermissions` object (`manageUsers`, `manageTokens`, …) and shares it on every request. Read with `useCan()`. Extending the object = adding a boolean field to `global_permissions.ts` computed from `user.hasPermission(PERMISSIONS.x)`; `useCan` types update automatically.
- **Escalation guards** are defense-in-depth on top of validators:
  - `requireManageRoles(executor)` — throws if the executor lacks `users.manage_roles`.
  - `requireManageRolesIfEscalating(executor, roleIds)` — enforces the check when any requested role is not the default one. Call at create / invite paths.
  - `assertNoSelfLockout(executor, nextRoles)` → `AdminLockoutException` — refuses any change (self role sync, editing or deleting one of the executor's roles) that would strip their own `users.manage_roles` or `roles.update`.

## Repo refs

- Capabilities: `app/users/enums/permission.ts`. Role model + CRUD: `app/users/models/role.ts`, `app/users/controllers/roles_controller.ts`, `app/users/services/role_service.ts`.
- `WithRoles` mixin: `app/users/mixins/with_roles.ts`. Policy: `app/users/policies/user_policy.ts`.
- Escalation / lockout guards: `RoleService.requireManageRoles`, `requireManageRolesIfEscalating`, `assertNoSelfLockout` in `app/users/services/role_service.ts` (injected into `UserService`).
- Shared `can` prop → frontend `useCan`: `app/users/services/global_permissions.ts`, `app/common/ui/hooks/use_can.ts`.
- Central registries: `app/core/policies/main.ts`, `app/core/abilities/main.ts`.

## Doc refs

- AdonisJS Bouncer — https://docs.adonisjs.com/guides/security/authorization

## Workflow

### Add a new permission

1. Add an entry to `PERMISSIONS`:
   ```ts
   export const PERMISSIONS = {
     ...,
     invoicesCreate: 'invoices.create',
   } as const
   ```
2. Reference it in the policy method that gates it:
   ```ts
   async create(user: User) { return user.hasPermission(PERMISSIONS.invoicesCreate) }
   ```
3. Grant it to the roles that need it from `/roles` (the seeder re-syncs the bootstrap `Admin` role with `ALL_PERMISSIONS`).
4. Add its label to `users.permissions.<mod>.<action>` (and `users.permission_groups.<mod>` for a new module) in every locale — the role form renders the catalog from these keys.
5. If the frontend needs a boolean for the permission, extend `GlobalPermissions`:
   ```ts
   canCreateInvoices: user?.hasPermission(PERMISSIONS.invoicesCreate) ?? false,
   ```

### Add a new role

Nothing to code: create it from `/roles` (requires `roles.create`). In tests, create rows directly or use `withPermissions(user, 'name', [...])`.

### Gate a route (mutation)

```ts
public async store({ auth, bouncer, request, response }: HttpContext) {
  await bouncer.with(InvoicePolicy).authorize('create')
  const payload = await request.validateUsing(createInvoiceValidator)
  await this.invoiceService.create({ ...payload, executor: auth.getUserOrFail() })
  return response.redirect().toRoute('invoices.index')
}
```

Policy runs before the validator so a 403 doesn't leak field-level errors to unauthorized callers. See [[crud]].

### Gate a UI element

```tsx
const can = useCan()
if (!can.manageUsers) return null
```

Or use the built-in `can: 'permissionKey'` field on nav items — see [[layout-shells]].

### Escalation-safe user creation / invite

In the service method that creates a user with a non-default role (`UserService` injects `RoleService`):

```ts
await this.roleService.requireManageRolesIfEscalating(input.executor, [input.role])
```

The validator alone isn't enough — a user with `users.create` but not `users.manage_roles` could try to escalate. This guard is defense-in-depth.

### Testing

Set roles per test with the RBAC helpers:

```ts
const admin = await UserFactory.create()
await withRole(admin, ROLES.ADMIN)

// or granular:
const editor = await UserFactory.create()
await withPermissions(editor, 'editor', [PERMISSIONS.invoicesCreate])
```

Cover the "unauth", "authenticated-but-forbidden", and "authorized" paths for each mutation. See [[testing]].

## Anti-patterns

- ❌ Referencing a role by name in `app/` code (`'admin'`, `hasRole('admin')`) — gate on a permission; roles are user-editable data. (`ROLES` in `tests/helpers/rbac.ts` is a test fixture only.)
- ❌ Hardcoding permission strings (`'users.create'`) — use `PERMISSIONS.usersCreate`.
- ❌ Skipping the policy call because "the validator already checked" — validators check payload shape, not authority.
- ❌ Adding a permission to `PERMISSIONS` without its i18n label — it shows as a raw key in the role form.
- ❌ Gating only on the frontend (`if (can.x)`) — always mirror the check on the backend policy. Frontend gating is UX, not security.
- ❌ Assigning role by slug string in tests instead of `withRole(user, ROLES.ADMIN)` — drifts if the slug ever changes.
- ❌ Removing an escalation guard "because the validator handles it" — it's defense in depth for a reason.
- ❌ Owner check via `.where('owner_id', user.id)` in a query instead of the policy — the policy is the source of truth; a query filter is an unrelated concern.

## Related skills

[[crud]] · [[testing]] · [[services-events]] · [[layout-shells]]
