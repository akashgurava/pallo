<script lang="ts">
  import { onMount } from "svelte";
  import * as Sheet from "$lib/components/ui/sheet/index";
  import { Button } from "$lib/components/ui/button/index";
  import FilterSidebar from "$lib/components/FilterSidebar.svelte";
  import PalTable from "$lib/components/PalTable.svelte";
  import { SvelteSet, SvelteMap } from "svelte/reactivity";
  import {
    filterPals,
    type FilterLogic,
    type WorkTypeFilter,
    type ElementFilter,
    type MountFilter,
    type StatFilter,
  } from "$lib/filters";
  import { sortPals, type SortKey, type SortDir } from "$lib/sorting";
  import type { PalRow } from "$lib/types";

  let palsList = $state<PalRow[]>([]);
  let loading = $state(true);
  let availableElements = $state<{ name: string }[]>([]);
  let availableWorkTypes = $state<{ name: string }[]>([]);
  let sheetOpen = $state(false);

  // Filter state
  let nameQuery = $state("");
  let selectedElements = $state<ElementFilter>(new Set());
  let workTypeFilter = $state<WorkTypeFilter>(new Map());
  let mountFilter = $state<MountFilter>({ types: new Set(), maxLevel: 0 });
  let statFilters = $state<StatFilter[]>([]);
  let elementLogic = $state<FilterLogic>("or");
  let workTypeLogic = $state<FilterLogic>("or");

  // Sorting
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

  // Filter + sort
  let filtered = $derived(
    filterPals(palsList, {
      nameQuery,
      selectedElements,
      workTypeFilter,
      mountFilter,
      statFilters,
      elementLogic,
      workTypeLogic,
    }),
  );

  let sorted = $derived(sortPals(filtered, sortKey, sortDir, workTypeFilter, workTypeLogic));

  let activeFilterCount = $derived(
    (nameQuery.length > 0 ? 1 : 0) +
      selectedElements.size +
      [...workTypeFilter.values()].filter((v) => v > 0).length +
      mountFilter.types.size +
      (mountFilter.maxLevel > 0 ? 1 : 0) +
      statFilters.length,
  );

  // Filter actions
  function toggleElement(name: string): void {
    const next = new SvelteSet(selectedElements);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    selectedElements = next;
  }

  function setWorkTypeLevel(name: string, level: number): void {
    const next = new SvelteMap(workTypeFilter);
    if (level === 0) {
      next.delete(name);
    } else {
      next.set(name, level);
    }
    workTypeFilter = next;
  }

  function toggleMountType(type: string): void {
    const next = new SvelteSet(mountFilter.types);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    mountFilter = { ...mountFilter, types: next };
  }

  function setMountMaxLevel(level: number): void {
    mountFilter = { ...mountFilter, maxLevel: level };
  }

  function addStatFilter(): void {
    statFilters = [...statFilters, { column: "rarity", op: ">=", value: 1 }];
  }

  function updateStatFilter(index: number, filter: StatFilter): void {
    const next = [...statFilters];
    next[index] = filter;
    statFilters = next;
  }

  function removeStatFilter(index: number): void {
    statFilters = statFilters.filter((_, i) => i !== index);
  }

  function clearFilters(): void {
    nameQuery = "";
    selectedElements = new Set();
    workTypeFilter = new Map();
    mountFilter = { types: new Set(), maxLevel: 0 };
    statFilters = [];
  }

  async function fetchPals(): Promise<void> {
    try {
      const res = await fetch("/api/pals");
      if (res.ok) {
        palsList = await res.json();
      } else {
        console.error(`Failed to fetch pals: ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch pals:", err);
    } finally {
      loading = false;
    }
  }

  async function fetchFilters(): Promise<void> {
    try {
      const res = await fetch("/api/filters");
      if (res.ok) {
        const data = await res.json();
        availableElements = data.elements;
        availableWorkTypes = data.workTypes;
      }
    } catch (err) {
      console.error("Failed to fetch filters:", err);
    }
  }

  onMount(() => {
    fetchPals();
    fetchFilters();
  });

  const filterProps = $derived({
    elements: availableElements,
    workTypes: availableWorkTypes,
    nameQuery,
    selectedElements,
    workTypeFilter,
    mountFilter,
    statFilters,
    elementLogic,
    workTypeLogic,
    onNameChange: (q: string) => (nameQuery = q),
    onToggleElement: toggleElement,
    onSetWorkTypeLevel: setWorkTypeLevel,
    onToggleMountType: toggleMountType,
    onSetMountMaxLevel: setMountMaxLevel,
    onAddStatFilter: addStatFilter,
    onUpdateStatFilter: updateStatFilter,
    onRemoveStatFilter: removeStatFilter,
    onSetElementLogic: (l: FilterLogic) => (elementLogic = l),
    onSetWorkTypeLogic: (l: FilterLogic) => (workTypeLogic = l),
    onClear: clearFilters,
  });
</script>

<div class="flex h-full">
  <!-- Desktop sidebar -->
  <aside class="border-border hidden w-80 shrink-0 overflow-y-auto border-r md:block">
    <FilterSidebar {...filterProps} />
  </aside>

  <!-- Main content -->
  <div class="flex-1 overflow-auto">
    <div class="px-4 pt-4">
      <!-- Mobile filter button -->
      <div class="mb-4 md:hidden">
        <Sheet.Root bind:open={sheetOpen}>
          <Sheet.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="outline" size="sm">
                Filters{#if activeFilterCount > 0}&nbsp;({activeFilterCount}){/if}
              </Button>
            {/snippet}
          </Sheet.Trigger>
          <Sheet.Content side="left" class="w-80 overflow-y-auto p-0">
            <Sheet.Header class="sr-only">
              <Sheet.Title>Filters</Sheet.Title>
            </Sheet.Header>
            <FilterSidebar {...filterProps} />
          </Sheet.Content>
        </Sheet.Root>
      </div>

      {#if loading}
        <div class="text-muted-foreground text-sm">Loading...</div>
      {:else if palsList.length === 0}
        <div class="text-muted-foreground text-sm">
          No pals found. Try refreshing the database from the Home page.
        </div>
      {:else}
        <div class="text-muted-foreground mb-2 text-sm">
          {sorted.length}/{palsList.length} pals
        </div>
        <PalTable
          pals={sorted}
          {sortKey}
          {sortDir}
          {workTypeFilter}
          onToggleSort={toggleSort}
          onToggleElement={toggleElement}
          onSetWorkTypeLevel={setWorkTypeLevel}
          onToggleMountType={toggleMountType}
        />
        <div class="pb-4"></div>
      {/if}
    </div>
  </div>
</div>
