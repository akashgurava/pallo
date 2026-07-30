# Pallo - Palworld Database App

## Stack

- SvelteKit 5 (strict runes mode: `$state`, `$derived`, `$derived.by`, `$effect`, `$props`, `$bindable`)
- SQLite via Drizzle ORM
- shadcn-svelte (bits-ui) for UI primitives
- Tailwind CSS
- pnpm (never npx for installs)
- Playwright for scraping

## Key Files

- Schema: `src/lib/server/db/schema.ts`
- Types: `src/lib/types.ts`
- Filters/sorting logic: `src/lib/filters.ts`, `src/lib/sorting.ts`
- Reusable components: `src/lib/components/`
- API routes: `src/routes/api/`
- Scraper: `src/lib/server/scraper/`

## UI Rules

### Fixed Layout / No Layout Shift

- All views MUST use fixed-size containers (`w-[Xrem]` or explicit pixel widths). Never use `max-w-*` alone on content that could expand/shrink based on data.
- Tables MUST use `table-fixed` with explicit `<colgroup>` column widths. Column widths must not change when data loads, filters change, or rows appear/disappear.
- The skeleton structure (inputs, filters, table headers) must always be visible regardless of whether data is present. Do not conditionally hide structural UI elements based on state.
- Autocomplete/search bars: always render all input controls even when empty or before options load. Pass empty array `[]` for pals prop when options are not yet available.

### Components

- Each tab view should be its own component file (e.g., `ParentsToChild.svelte`, `OneParentToChilds.svelte`, `ChildToParents.svelte`).
- Components own their own fixed width (e.g., `<div class="w-176">`). Parent centers them with `flex justify-center`.
- Reusable display components: `PalInlineInfo`, `PalAutocomplete`, `ElementIcon`, `WorkTypeIcon`, `MountIcon`.
- `PalAutocomplete` has a fixed `w-80` built-in. Do not wrap it in sizing containers.

### Icons & Sizing

- Element icons in filters: `size-7`
- Element icons in tables: `size-5` (clickable to toggle filter)
- Work icons in tables: `size-5` with level text
- Mount icons: show all type icons followed by single unlock level number (level is same for all types)
- Text in tables: `text-sm`

### Tabs (bits-ui)

- Active state uses `data-[state=active]:bg-white/10 data-[state=active]:text-white` (NOT `data-active`)
- Tab bar centered with `flex justify-center`

## Data Rules

- Breeding is commutative: `parent1_id <= parent2_id` (canonical ordering)
- "Child → Parents" shows combinations not permutations
- Elements and work types must always be displayed in `sortOrder` from the database
- Sort by pal number for parent/child columns, total work level for work column, unlock level for mount column
- Prefer NOT NULL (`.notNull()`) initially for new database columns in schema; only relax to nullable if issues or missing optional data arise during integration

## State Persistence

- Use localStorage with a single key per page (e.g., `pallo:breeding`)
- Save/restore all filter state, active tab, selected pals
- Deferred restore pattern: when restoring a selection that depends on async data (e.g., child filter depends on results loading), store the ID in a temp variable (`let pendingChildFilterId = $state<number | null>(null)`) and apply it in a `$effect` once the dependent data is available. See `src/routes/breeding/+page.svelte` for reference.
- Track previous IDs (`prevSingleParentId`) to distinguish user-initiated changes from restore-triggered effect runs — only clear dependent state on actual user changes.

## Commands

- Dev: `pnpm dev`
- Type check: `pnpm check` (runs `svelte-check`)
- Build: `pnpm build`
- Lint: `pnpm lint`
- Database push: `pnpm drizzle-kit push`
- Generate migration: `pnpm drizzle-kit generate`
- Svelte Docs: `npx -y @sveltejs/mcp get-documentation <section>`
- Svelte Autofix: `npx -y @sveltejs/mcp svelte-autofixer --path <filepath>`

## Code Practices

- No `any` types. Define interfaces or use `unknown` with guards.
- Prefer `$bindable()` props for two-way state between parent page and tab components.
- Each component fetches its own data (API calls) based on its props.
- No duplicate logic — if filtering/sorting logic is shared, extract it.
- Do not add comments, docstrings, or type annotations to code that wasn't changed.
- Keep chat responses terse. No trailing summaries of what was just done — the diff speaks for itself.

## Responsive

- Desktop only. No mobile breakpoints. Horizontal scroll via `overflow-x-auto` on table wrappers is acceptable for wide tables.

## Don'ts

- Never use `overflow-hidden` on containers with dropdowns/popovers
- Never use `flex-1` or `max-w-*` as sole width control for components that need stable sizing
- Never conditionally render structural elements (inputs, filter bars, table headers) based on data state
- Never use grid-cols-2 for search bars that should be flex with fixed-width components
- Never bundle all tab logic in a single file — split into components
