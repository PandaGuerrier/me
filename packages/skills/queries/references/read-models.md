# Read models — aggregate screens

Per-concept read methods for dashboards, reports, and homepage widgets. Input is just the scope (`{ period }`, `{ tenantId }`, `{ userId }`). Return is a plain object with the KPIs / trends / lists for that one concept. The controller composes several with `Promise.all([...])`.

The kit ships no DB-backed read model yet — `analytics` is demo data (synthesized), so there's no canonical file worth copying. Follow the shape below instead: a return `type`, one service method per business concept, composed in the controller with `Promise.all`; write real Lucid aggregates in each body.

## Rules

- **One method per business concept** — not one per widget (fragmentation), not one per screen (couples the query to a specific UI).
- **Composition happens in the controller**, not inside a query. If a screen needs three concepts, the controller does `Promise.all([...])`; each method stays pure and reusable.
- **Return `type` (not `interface`)** — the plain object flows through `inertia.render(...)`, and Inertia's `InertiaProps<T extends JSONDataTypes>` requires an index signature that `interface` doesn't satisfy (typecheck fails with `Type 'X' is not assignable to type 'JSONDataTypes'`).

## Workflow

1. Identify the **business concept** the data belongs to (revenue, user, subscription, order) — not the widget.
2. Add the method to the concept's service in `app/<mod>/services/` (create `metrics_service.ts` if the concept has no write side).
3. Define the return `type` (not `interface`) in `app/<mod>/types/metrics_service.ts`:
   ```ts
   export type RevenueMetrics = {
     revenue: { value: number; change: number; trend: number[]; format: 'currency' }
     chart: number[]
   }
   ```
4. Method:
   ```ts
   export default class MetricsService {
     async revenue({ period }: { period: Period }): Promise<RevenueMetrics> { /* ... */ }
   }
   ```
5. Controller (with `MetricsService` injected) composes:
   ```ts
   const [revenue, users, subscriptions] = await Promise.all([
     this.metricsService.revenue({ period }),
     this.metricsService.users({ period }),
     this.metricsService.subscriptions({ period }),
   ])
   return inertia.render('<mod>/dashboard', { period, revenue, users, subscriptions })
   ```
6. Page consumes types via `import type`:
   ```ts
   import type { RevenueMetrics } from '#<mod>/types/metrics_service'
   type PageProps = InertiaProps<{ period: Period; revenue: RevenueMetrics /* ... */ }>
   ```

## Anti-patterns

- ❌ One mega-method returning everything a screen needs — couples the read to a specific UI, not reusable when the same concept appears elsewhere.
- ❌ One method per widget — fragmentation. The controller becomes a 6-item `Promise.all` with barely any logic per method.
- ❌ Using `interface` for a return type that flows through Inertia — fails the `JSONDataTypes` typecheck. Use `type`.
- ❌ Screen-shaped assembly inside a service method (a `dashboardKpis()` returning a dashboard blob) — assembly happens in the controller.
- ❌ Returning raw Lucid instances to Inertia — return a plain object shape.
