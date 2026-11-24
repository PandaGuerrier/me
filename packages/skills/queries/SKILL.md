---
name: queries
description: 'Read-side patterns in an AdonisJS + Inertia app — reads are methods on the aggregate service (`list`, `listHome`, `getIntro`…), never separate query classes. Two flavors. **List methods** for CRUD tables (Lucid paginator with search + filter + sort). **Read models** for aggregate screens (dashboards, reports) with one method per business concept composed by the controller. Types live in `types/<aggregate>_service.ts` and cross to the frontend via `import type`. Trigger on: "query", "list users", "dashboard data", "read model", "fetch data", "aggregate", "read side".'
license: MIT
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# Queries

Reads are public methods on the aggregate's service in `app/<mod>/services/` — the same class that holds its writes (see [[services-events]]). There is no `queries/` folder. Filter, pagination and return types live in `app/<mod>/types/<aggregate>_service.ts`; the frontend consumes them via `import type`.

## Two flavors — pick one, then open its reference

The two shapes never coexist in one task. Choose by what you're building:

- **List method** — a paginated CRUD table (search / filter / sort), returning `ModelPaginatorContract<Model>` for a resource `index`. → [references/list-queries.md](references/list-queries.md).
- **Read model** — an aggregate screen (dashboard, report): one method per business concept, composed by the controller with `Promise.all([...])`. → [references/read-models.md](references/read-models.md).

## Rules (both flavors)

- **Location**: a method on the aggregate service — `UserService.list(filters, pag)`, `UserService.listOptions()`. Read-model concepts without a write side get their own service (`MetricsService.revenue({ period })`).
- **Shape**: `async <verb><Subject>(input)`. Inputs and return types in `types/<aggregate>_service.ts`. No `HttpContext`.
- **Consumers inject the service** with `@inject()` — never `new`.
- **Split by business concept** — not by widget (fragmentation) and not per screen (couples the read to a UI).
- **Frontend consumes types via `import type`** from the types file. Type-only imports are stripped at build, so the frontend never bundles server code.
- **Never return raw Lucid instances to Inertia** — lists run through a Transformer variant ([[crud]]); read models return a plain object shape.

## Doc refs

- Lucid pagination — https://lucid.adonisjs.com/docs/pagination
- CQRS reads (Martin Fowler) — https://martinfowler.com/bliki/CQRS.html
- Read models in CQRS — https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs

## Testing

Unit-test the method on a container-resolved service (`const invoiceService = await app.container.make(InvoiceService)`, then `await invoiceService.list({...})`) with a factory-seeded DB inside `wrapInGlobalTransaction`. See [[testing]].

## Related skills

[[crud]] · [[inertia]] · [[services-events]] · [[testing]] · [[authorization]]
