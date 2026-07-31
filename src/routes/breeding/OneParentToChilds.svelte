<script lang="ts">
  import { SvelteSet, SvelteMap } from "svelte/reactivity";
  import PalAutocomplete from "$lib/components/PalAutocomplete.svelte";
  import PalTable from "$lib/components/PalTable.svelte";
  import ElementIcon from "$lib/components/ElementIcon.svelte";
  import { sortPals, type SortKey, type SortDir } from "$lib/sorting.js";
  import type { WorkTypeFilter } from "$lib/filters.js";
  import type { PalRow, WorkSuitability, MountInfo, PalStatsData, PalMovement } from "$lib/types.js";

  interface BreedingChild {
    id: number;
    number: string;
    variant: string | null;
    name: string;
    elements: string[];
    workSuitabilities: WorkSuitability[];
    mounts: MountInfo[];
    stats: PalStatsData;
    movement: PalMovement;
  }

  interface BreedingAllResult {
    parent: { id: number; number: string; name: string; elements: string[]; mounts: MountInfo[] };
    child: BreedingChild;
  }

  let {
    pals,
    availableElements,
    availableWorkTypes,
    singleParent = $bindable(),
    parentBFilter = $bindable(),
    childFilter = $bindable(),
    selectedElements = $bindable(),
    selectedWorkTypes = $bindable(),
    selectedMounts = $bindable(),
  }: {
    pals: PalRow[];
    availableElements: string[];
    availableWorkTypes: string[];
    singleParent: PalRow | null;
    parentBFilter: PalRow | null;
    childFilter: PalRow | null;
    selectedElements: Set<string>;
    selectedWorkTypes: Set<string>;
    selectedMounts: Set<string>;
  } = $props();

  const mountTypes = ["Ground", "Flying", "Water"];

  let allResults = $state<BreedingAllResult[]>([]);

  $effect(() => {
    if (!singleParent) {
      allResults = [];
      return;
    }
    const controller = new AbortController();
    fetch(`/api/breeding/all?parent=${singleParent.id}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => {
        allResults = d.results ?? [];
      })
      .catch((e) => {
        if (e.name !== "AbortError") allResults = [];
      });
    return () => controller.abort();
  });

  let childOptions = $derived.by(() => {
    const seen = new SvelteSet<number>();
    const options: PalRow[] = [];
    for (const row of allResults) {
      if (!seen.has(row.child.id)) {
        seen.add(row.child.id);
        const pal = pals.find((p) => p.id === row.child.id);
        if (pal) options.push(pal);
      }
    }
    return options.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
  });

  let parentBOptions = $derived.by(() => {
    const seen = new SvelteSet<number>();
    const options: PalRow[] = [];
    for (const row of allResults) {
      if (!seen.has(row.parent.id)) {
        seen.add(row.parent.id);
        const pal = pals.find((p) => p.id === row.parent.id);
        if (pal) options.push(pal);
      }
    }
    return options.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
  });

  // Expose childOptions for parent to use with pending restore
  export function getChildOptions(): PalRow[] {
    return childOptions;
  }

  let sortKey = $state<SortKey>("id");
  let sortDir = $state<SortDir>("asc");

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  }

  function toggleElement(name: string): void {
    const next = new SvelteSet(selectedElements);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    selectedElements = next;
  }

  function toggleWorkType(name: string): void {
    const next = new SvelteSet(selectedWorkTypes);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    selectedWorkTypes = next;
  }

  function setWorkTypeLevel(name: string, level: number): void {
    if (level === 0) {
      const next = new SvelteSet(selectedWorkTypes);
      next.delete(name);
      selectedWorkTypes = next;
    } else {
      const next = new SvelteSet(selectedWorkTypes);
      next.add(name);
      selectedWorkTypes = next;
    }
  }

  function toggleMount(type: string): void {
    const next = new SvelteSet(selectedMounts);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    selectedMounts = next;
  }

  function matchesFilters(row: BreedingAllResult): boolean {
    if (parentBFilter && row.parent.id !== parentBFilter.id) return false;
    if (childFilter && row.child.id !== childFilter.id) return false;
    if (selectedElements.size > 0) {
      if (!row.child.elements.some((e) => selectedElements.has(e))) return false;
    }
    if (selectedWorkTypes.size > 0) {
      if (!row.child.workSuitabilities.some((w) => selectedWorkTypes.has(w.workType))) return false;
    }
    if (selectedMounts.size > 0) {
      if (!row.child.mounts.some((m) => selectedMounts.has(m.type))) return false;
    }
    return true;
  }

  let filteredResults = $derived(allResults.filter(matchesFilters));

  // Convert filtered children to PalRow[] for the shared table
  let filteredPals = $derived.by(() => {
    const seen = new SvelteSet<number>();
    const result: PalRow[] = [];
    for (const row of filteredResults) {
      if (!seen.has(row.child.id)) {
        seen.add(row.child.id);
        result.push(row.child);
      }
    }
    return result;
  });

  let workTypeFilterMap = $derived<WorkTypeFilter>(
    new SvelteMap([...selectedWorkTypes].map((name) => [name, 1])),
  );

  let sortedPals = $derived(sortPals(filteredPals, sortKey, sortDir, workTypeFilterMap, "or"));

  let lastSingleParentId: number | null = singleParent?.id ?? null;

  $effect.pre(() => {
    const currentId = singleParent?.id ?? null;
    if (lastSingleParentId !== currentId) {
      if (lastSingleParentId !== null) {
        childFilter = null;
        parentBFilter = null;
      }
      lastSingleParentId = currentId;
    }
  });
</script>

<div class="space-y-4">
  <div class="flex gap-4">
    <div>
      <span class="text-muted-foreground mb-1 block text-sm">Parent</span>
      <PalAutocomplete
        {pals}
        selected={singleParent}
        placeholder="Search parent..."
        onSelect={(pal) => { singleParent = pal; }}
      />
    </div>
    <div>
      <span class="text-muted-foreground mb-1 block text-sm">Filter Parent B</span>
      <PalAutocomplete
        pals={singleParent ? parentBOptions : []}
        selected={parentBFilter}
        placeholder="Filter by parent B..."
        onSelect={(pal) => (parentBFilter = pal)}
      />
    </div>
    <div>
      <span class="text-muted-foreground mb-1 block text-sm">Filter child</span>
      <PalAutocomplete
        pals={singleParent ? childOptions : []}
        selected={childFilter}
        placeholder="Filter by child..."
        onSelect={(pal) => (childFilter = pal)}
      />
    </div>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-1.5">
    {#each availableElements as el (el)}
      <ElementIcon
        name={el}
        size="size-7"
        active={selectedElements.has(el)}
        onclick={() => toggleElement(el)}
      />
    {/each}
    <span class="mx-2 h-6 w-px bg-neutral-700"></span>
    {#each availableWorkTypes as wt (wt)}
      <button
        onclick={() => toggleWorkType(wt)}
        class="rounded p-1.5 transition-colors {selectedWorkTypes.has(wt)
          ? 'bg-primary/30 ring-primary ring-1'
          : 'hover:bg-muted'}"
        title={wt}
      >
        <img src="/icons/work/{wt.toLowerCase().replace(/ /g, '-')}.webp" alt={wt} class="size-7" />
      </button>
    {/each}
    <span class="mx-2 h-6 w-px bg-neutral-700"></span>
    {#each mountTypes as mt (mt)}
      <button
        onclick={() => toggleMount(mt)}
        class="rounded p-1.5 transition-colors {selectedMounts.has(mt)
          ? 'bg-primary/30 ring-primary ring-1'
          : 'hover:bg-muted'}"
        title={mt}
      >
        <img src="/icons/mounts/{mt.toLowerCase()}.svg" alt={mt} class="size-7" />
      </button>
    {/each}
  </div>

  {#if $effect.pending()}
    <div class="text-muted-foreground text-sm">Looking up...</div>
  {:else if allResults.length > 0}
    <div class="text-muted-foreground text-sm">
      {sortedPals.length}/{new Set(allResults.map((r) => r.child.id)).size} unique children
    </div>
  {/if}

  <PalTable
    pals={sortedPals}
    {sortKey}
    {sortDir}
    workTypeFilter={workTypeFilterMap}
    onToggleSort={toggleSort}
    onToggleElement={toggleElement}
    onSetWorkTypeLevel={setWorkTypeLevel}
    onToggleMountType={toggleMount}
  >
    {#snippet expandedRow(childPal)}
      {@const parentBFullPals = allResults
        .filter((r) => r.child.id === childPal.id)
        .map((r) => pals.find((p) => p.id === r.parent.id))
        .filter((p): p is PalRow => p !== undefined)}
      {@const parentBList = sortPals(parentBFullPals, sortKey, sortDir, workTypeFilterMap, "or")}
      <div class="max-w-full overflow-x-auto px-2 py-1">
        <div class="flex flex-nowrap items-center gap-1.5 py-0.5">
          {#each parentBList as parentB (parentB.id)}
            <div class="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs">
              <span class="font-mono text-neutral-400">#{parentB.number}</span>
              <span class="font-medium text-neutral-200">{parentB.name}</span>
              <div class="flex items-center gap-0.5">
                {#each parentB.elements as el (el)}
                  <img src="/icons/elements/{el.toLowerCase()}.webp" alt={el} class="size-4" />
                {/each}
              </div>
              {#if parentB.mounts.length > 0}
                <div class="flex items-center gap-0.5 border-l border-neutral-800 pl-1">
                  {#each parentB.mounts as mount (mount.type)}
                    <img src="/icons/mounts/{mount.type.toLowerCase()}.svg" alt={mount.type} class="size-3.5" title="{mount.type} Mount" />
                  {/each}
                  <span class="text-neutral-400 text-[10px] font-semibold">{parentB.mounts[0]?.unlockLevel}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/snippet}
  </PalTable>
</div>
