# List methods — paginated CRUD tables

Paginated Lucid queries with search, filter, and sort, as the `list` method of the aggregate service. Input is `(filters, pagination)`; return is `ModelPaginatorContract<Model>`. Consumed by a resource `index` controller action + Inertia list page.

Canonical: `UserService.list` in `app/users/services/user_service.ts` (types in `app/users/types/user_service.ts`), consumed by `app/users/controllers/users_controller.ts`.

## Rule

- **Add an `id` tiebreaker at the end of `orderBy`** — without it, two rows sharing the sorted column can swap pages between requests.

## Workflow

1. Open the aggregate service `app/<mod>/services/<aggregate>_service.ts`.
2. Define input types in `app/<mod>/types/<aggregate>_service.ts`:
   ```ts
   export interface ListInvoicesFilters {
     q?: string
     status?: InvoiceStatus[]
     sort?: InvoicesSortBy
     order?: SortDirection
   }
   export interface ListInvoicesPagination { page: number; perPage: number }
   ```
3. `list` method returning the paginator:
   ```ts
   export default class InvoiceService {
     async list(
       filters: ListInvoicesFilters = {},
       pag: ListInvoicesPagination = { page: 1, perPage: 10 }
     ) {
       const query = Invoice.query()
       if (filters.q) query.where('reference', 'ilike', `%${filters.q}%`)
       if (filters.status?.length) query.whereIn('status', filters.status)
       query.orderBy(
         filters.sort ? SORT_COLUMN[filters.sort] : 'created_at',
         filters.order ?? 'desc'
       )
       query.orderBy('id', 'asc') // tiebreaker prevents page swaps
       return query.paginate(pag.page, pag.perPage)
     }
   }
   ```
4. Controller (with `InvoiceService` injected): `authorize → validate → this.invoiceService.list(...) → transformer variant → inertia.render`. See [[crud]].

## Anti-patterns

- ❌ Paginating without an `id` tiebreaker — rows tied on the sorted column can swap between pages.
- ❌ Returning raw Lucid instances to Inertia — run the list through a Transformer variant ([[crud]]).
