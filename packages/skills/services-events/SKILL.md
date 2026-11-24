---
name: services-events
description: 'Service + event pattern for AdonisJS. One service class per aggregate groups its related operations (reads and writes) as public methods; inputs live in `app/<mod>/types/<service>.ts`; consumers receive services through `@inject()`, never `new`. Services never touch `HttpContext` and never call side-effect code (mail, notifications, transmit) directly — they emit a domain event and a listener runs the effect. Use when adding a service method, wiring a domain event, or adding a listener. Trigger on: "create service", "add action", "emit event", "add listener", "domain event", "@inject".'
license: MIT
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# Services + events

Business logic lives in **services**; cross-cutting effects run through **events**. A service groups the operations of one aggregate — `UserService` holds `list`, `create`, `update`, `delete`, `invite`. Controllers stay thin (`policy → validate → service → response`) and receive their services through `@inject()`. Services take plain inputs, never `HttpContext`. When a service needs a side effect (mail, notification, transmit, external HTTP), it **emits a domain event**; a listener runs the effect. This keeps services synchronous domain code, keeps side effects composable (a new listener is a new file, not an edit to the service), and makes testing effortless — fake the emitter, swap a service in the container.

## Rules

- **Location**: `app/<mod>/services/<aggregate>_service.ts` — one service per aggregate, holding every related operation (reads and writes). A module may hold several (`UserService` + `RoleService`).
- **Types next door**: every input / filter / pagination / result type lives in `app/<mod>/types/<aggregate>_service.ts`, never in the service file.
- **Shape**: default-export a class whose public methods are the operations: `async create(input: CreateXInput): Promise<X>`, `async list(filters, pag)`, … Inputs are plain `interface`s. No `HttpContext`. Private helpers are `private` methods.
- **Dependency injection only**: anything that consumes a service — controller, middleware, listener, another service — declares it in its constructor and is decorated with `@inject()`:
  ```ts
  @inject()
  export default class UsersController {
    constructor(protected userService: UserService) {}
  }
  ```
  Never `new XService()`. A service that depends on another service gets `@inject()` too (`UserService` injects `RoleService`).
- **Return or throw**: return the primary value (a model, a paginator, void). Throw domain exceptions from `app/<mod>/exceptions/` for expected failure paths.
- **Guards as public service methods** — `RoleService.requireManageRoles(executor)`, `assertNoSelfLockout(...)`. Another service that needs them injects the owning service.
- **Side effects go through events**. Anything that reaches out is emitted, not called inline:
  ```ts
  emitter.emit('user:registered', { user, translations })
  ```
  This applies to every kind of effect without exception:

  | Kind | Example call the service must **not** make |
  | --- | --- |
  | Mail | `mail.send(new WelcomeEmail(...))` |
  | In-app notification | `facteur.notification(...).send()` |
  | SSE / realtime broadcast | `transmit.broadcast(channel, payload)` |
  | External HTTP | `fetch('https://api.stripe.com/...')` |
  | Audit log write | any write to an `audits` / `activity_logs` table that's cross-cutting |

- **Listeners**: register in `app/<mod>/start/events.ts`. A listener that only calls a mail/notification class can be an inline closure. A listener that needs a service is a class in `app/<mod>/listeners/<verb_noun>.ts` with `@inject()` and a `handle(data)` method, registered lazily so the container builds it:
  ```ts
  const SendWelcomeMail = () => import('#users/listeners/send_welcome_mail')
  emitter.on('user:registered', [SendWelcomeMail])
  ```

## Repo refs

- Service shape (CRUD + reads on one aggregate): `app/users/services/user_service.ts`, types in `app/users/types/user_service.ts`.
- Service injecting a service + shared guards: `app/users/services/user_service.ts` → `app/users/services/role_service.ts`.
- Controller injection: `app/users/controllers/users_controller.ts`.
- Event typing (declaration merge): `app/users/types/events.ts`; closure listener: `app/users/start/events.ts`.

## Doc refs

- AdonisJS dependency injection — https://docs.adonisjs.com/guides/concepts/dependency-injection
- AdonisJS emitter — https://docs.adonisjs.com/guides/digging-deeper/emitter

## Workflow

### Add an operation

1. Find the aggregate's service in `app/<mod>/services/`. Create `<aggregate>_service.ts` only if the aggregate has none.
2. Declare the input `interface` in `app/<mod>/types/<aggregate>_service.ts` — everything the operation needs, as plain values. Pass `auth` / `session` only if the method must call `auth.use(...).login(user)`.
3. Add the public method:
   ```ts
   async issue(input: IssueInvoiceInput): Promise<Invoice> {
     // guards, domain logic, DB writes
     // emit if there are side effects
     return invoice
   }
   ```
4. In the consumer, inject the service (`@inject()` + constructor) and call `this.invoiceService.issue(...)`.

### Emit a domain event

Inside the service method, at the point the side effect should trigger:

```ts
emitter.emit('<mod>:<event>', payload)
```

Naming: `<mod>:<past-tense-verb>` — `user:registered`, `invoice:issued`, `role:changed`.

Payload: plain, serializable. Include the primary entity + whatever the listener needs. Never reach for `HttpContext` fields.

### Add a listener

1. Open (or create) `app/<mod>/start/events.ts`.
2. No service needed → `emitter.on('<event>', async (data) => { ... })`. Needs a service → listener class in `app/<mod>/listeners/` (see Rules) and `emitter.on('<event>', [LazyListener])`.
3. Ensure `() => import('#<mod>/start/events')` is in `adonisrc.ts` preloads.
4. Multiple listeners on the same event are fine — one per side effect (one mail, one notification, one webhook).

### Concurrency — operations that read-then-write a sequence

When an operation derives a value from the current state of a set (next `position` in a list, next `number` in a sequence, unique slug), two concurrent invocations against the same parent will both read the same max and produce a duplicate. Two-layer defense:

1. **`unique(...)` on the schema** so the DB rejects the second write. A safety net, not a UX.
2. **`db.transaction()` with `SELECT parent FOR UPDATE`** to serialize the compute-and-insert on the parent aggregate. Lock the **parent**, not the aggregated table.

```ts
async addItem(input: AddItemInput): Promise<Item> {
  const item = await db.transaction(async (trx) => {
    // Lock the parent row for the length of the trx.
    await Parent.query({ client: trx })
      .where('id', input.parentId)
      .forUpdate()
      .firstOrFail()

    const last = await Item.query({ client: trx })
      .where('parent_id', input.parentId)
      .max('position as max')
      .first()

    const position = (Number((last as any)?.$extras?.max) || 0) + 1

    return Item.create(
      { parentId: input.parentId, position, ...input.payload },
      { client: trx }
    )
  })

  await emitter.emit('item:added', { item, parentId: input.parentId })
  return item
}
```

Same shape for deletes with reordering: hold the parent lock, delete, decrement the range.

Do heavy I/O (file upload, external HTTP) **outside** the transaction so the lock isn't held while bytes stream.

### Testing

- Resolve the service from the container once per spec file: `const userService = await app.container.make(UserService)` — see [[testing]].
- Replace a dependency with `app.container.swap(RoleService, () => fake)` and `app.container.restore(RoleService)` in teardown.
- Fake the emitter in endpoint tests to verify emission without running listeners: `emitter.fake(['user:registered'])` then `fake.assertEmitted('user:registered')`.

## Anti-patterns

- ❌ `new XService()` anywhere — inject it.
- ❌ One service per operation (`CreateInvoiceService`) — group by aggregate.
- ❌ Input types declared inside the service file — they go in `types/<aggregate>_service.ts`.
- ❌ Service method takes `HttpContext` — extract the pieces it needs and pass those as plain fields.
- ❌ Service calls `mail.send(...)` / `facteur.notification(...).send()` / `transmit.broadcast(...)` directly — emit an event, let the listener do it.
- ❌ Read-then-write on a computed column (next position, next sequence number) without `.forUpdate()` on the parent + `unique(...)` on the schema — the race produces duplicates.
- ❌ Business logic in the controller (`if (user.isX) { ... } await something()`) — move it to a service method.
- ❌ Listener that reaches into another module's DB directly — cross-module effects should emit their own domain event from the source module and be handled by a listener that owns the destination.
- ❌ Emitting from inside a `db.transaction(...)` — if the transaction rolls back, the listeners already ran. Emit **after** the trx commits.

## Related skills

[[module-scaffolding]] · [[routes]] · [[crud]] · [[queries]] · [[testing]] · [[mail]] · [[notifications]]
