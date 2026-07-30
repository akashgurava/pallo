<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import * as Table from "$lib/components/ui/table/index.js";
  import PalAutocomplete from "$lib/components/PalAutocomplete.svelte";
  import ElementIcon from "$lib/components/ElementIcon.svelte";
  import type {
    PalRow,
    WorkSuitability,
    MountInfo,
    PalStatsData,
    PalMovement,
  } from "$lib/types.js";

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
    childFilter = $bindable(),
    selectedElements = $bindable(),
    selectedWorkTypes = $bindable(),
    selectedMounts = $bindable(),
  }: {
    pals: PalRow[];
    availableElements: string[];
    availableWorkTypes: string[];
    singleParent: PalRow | null;
    childFilter: PalRow | null;
    selectedElements: Set<string>;
    selectedWorkTypes: Set<string>;
    selectedMounts: Set<string>;
  } = $props();

  const mountTypes = ["Ground", "Flying", "Water"];

  let allResults = $state<BreedingAllResult[]>([]);
  let lookingUpAll = $state(false);

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

  // Expose childOptions for parent to use with pending restore
  export function getChildOptions(): PalRow[] {
    return childOptions;
  }

  type AllSortKey =
    | "parent"
    | "child"
    | "work"
    | "mount"
    | "rarity"
    | "slow"
    | "walk"
    | "run"
    | "sprint"
    | "tpot"
    | "swim"
    | "dash"
    | "stam"
    | "hp"
    | "atk"
    | "def"
    | "food"
    | "price";
  type SortDir = "asc" | "desc";
  let sortKey = $state<AllSortKey>("child");
  let sortDir = $state<SortDir>("asc");

  function toggleSort(key: AllSortKey): void {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  }

  function getSortValue(row: BreedingAllResult, key: AllSortKey): number {
    switch (key) {
      case "parent":
        return parseInt(row.parent.number) || 0;
      case "child":
        return parseInt(row.child.number) || 0;
      case "work":
        return row.child.workSuitabilities.reduce((sum, w) => sum + w.level, 0);
      case "mount":
        return row.child.mounts.length > 0 ? row.child.mounts[0].unlockLevel : 9999;
      case "rarity":
        return row.child.stats?.rarity ?? 0;
      case "slow":
        return row.child.movement?.slowWalkSpeed ?? 0;
      case "walk":
        return row.child.movement?.walkSpeed ?? 0;
      case "run":
        return row.child.movement?.runSpeed ?? 0;
      case "sprint":
        return row.child.movement?.rideSprintSpeed ?? 0;
      case "tpot":
        return row.child.movement?.transportSpeed ?? 0;
      case "swim":
        return row.child.movement?.swimSpeed ?? 0;
      case "dash":
        return row.child.movement?.swimDashSpeed ?? 0;
      case "stam":
        return row.child.movement?.stamina ?? 0;
      case "hp":
        return row.child.stats?.health ?? 0;
      case "atk":
        return row.child.stats?.attack ?? 0;
      case "def":
        return row.child.stats?.defense ?? 0;
      case "food":
        return row.child.stats?.food ?? 0;
      case "price":
        return row.child.stats?.price ?? 0;
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

  function toggleMount(type: string): void {
    const next = new SvelteSet(selectedMounts);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    selectedMounts = next;
  }

  function matchesFilters(row: BreedingAllResult): boolean {
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

  let sortedResults = $derived(
    [...filteredResults].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      return sortDir === "asc" ? av - bv : bv - av;
    }),
  );

  async function lookupAll(): Promise<void> {
    if (!singleParent) {
      allResults = [];
      return;
    }
    lookingUpAll = true;
    try {
      const res = await fetch(`/api/breeding/all?parent=${singleParent.id}`);
      if (res.ok) {
        const data = await res.json();
        allResults = data.results ?? [];
      } else {
        allResults = [];
      }
    } catch (err) {
      console.error("Breeding all lookup failed:", err);
      allResults = [];
    } finally {
      lookingUpAll = false;
    }
  }

  let prevSingleParentId = $state<number | null>(null);
  $effect(() => {
    if (singleParent) {
      const changed = prevSingleParentId !== null && prevSingleParentId !== singleParent.id;
      prevSingleParentId = singleParent.id;
      lookupAll();
      if (changed) childFilter = null;
    } else {
      prevSingleParentId = null;
      allResults = [];
      childFilter = null;
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
        onSelect={(pal) => (singleParent = pal)}
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

  {#if lookingUpAll}
    <div class="text-muted-foreground text-sm">Looking up...</div>
  {:else if allResults.length > 0}
    <div class="text-muted-foreground text-sm">
      {new Set(sortedResults.map((r) => r.child.id)).size}/{new Set(
        allResults.map((r) => r.child.id),
      ).size} unique children
    </div>
  {/if}

  <div class="overflow-x-auto rounded-md border border-neutral-800">
    <Table.Root class="w-[1400px] table-fixed text-sm">
      <colgroup>
        <col class="w-[180px]" /><!-- Parent B -->
        <col class="w-[180px]" /><!-- Child -->
        <col class="w-[200px]" /><!-- Work -->
        <col class="w-[100px]" /><!-- Mount -->
        <col class="w-[45px]" /><!-- Rar -->
        <col class="w-[45px]" /><!-- Slow -->
        <col class="w-[45px]" /><!-- Walk -->
        <col class="w-[45px]" /><!-- Run -->
        <col class="w-[50px]" /><!-- Sprint -->
        <col class="w-[45px]" /><!-- TPot -->
        <col class="w-[45px]" /><!-- Swim -->
        <col class="w-[45px]" /><!-- Dash -->
        <col class="w-[45px]" /><!-- Stam -->
        <col class="w-[40px]" /><!-- HP -->
        <col class="w-[40px]" /><!-- ATK -->
        <col class="w-[40px]" /><!-- DEF -->
        <col class="w-[45px]" /><!-- Food -->
        <col class="w-[45px]" /><!-- Coin -->
      </colgroup>
      <Table.Header>
        <Table.Row>
          {#each [{ key: "parent", label: "Parent B" }, { key: "child", label: "Child" }, { key: "work", label: "Work" }, { key: "mount", label: "Mount" }, { key: "rarity", label: "Rar" }, { key: "slow", label: "Slow" }, { key: "walk", label: "Walk" }, { key: "run", label: "Run" }, { key: "sprint", label: "Sprint" }, { key: "tpot", label: "TPot" }, { key: "swim", label: "Swim" }, { key: "dash", label: "Dash" }, { key: "stam", label: "Stam" }, { key: "hp", label: "HP" }, { key: "atk", label: "ATK" }, { key: "def", label: "DEF" }, { key: "food", label: "Food" }, { key: "price", label: "Coin" }] as col (col.key)}
            <th
              class="text-muted-foreground cursor-pointer px-2 text-center text-sm font-medium select-none"
              onclick={() => toggleSort(col.key as AllSortKey)}
            >
              {col.label}{sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
            </th>
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each sortedResults as row (row.parent.id)}
          <Table.Row>
            <Table.Cell class="whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <span class="text-muted-foreground">#{row.parent.number}</span>
                <span>{row.parent.name}</span>
                {#each row.parent.elements as el (el)}
                  <button type="button" class="cursor-pointer" onclick={() => toggleElement(el)}>
                    <img src="/icons/elements/{el.toLowerCase()}.webp" alt={el} class="size-5" />
                  </button>
                {/each}
              </div>
            </Table.Cell>
            <Table.Cell class="whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <span class="text-muted-foreground">#{row.child.number}</span>
                <span class="font-medium">{row.child.name}</span>
                {#each row.child.elements as el (el)}
                  <button type="button" class="cursor-pointer" onclick={() => toggleElement(el)}>
                    <img src="/icons/elements/{el.toLowerCase()}.webp" alt={el} class="size-5" />
                  </button>
                {/each}
              </div>
            </Table.Cell>
            <Table.Cell>
              <div class="flex items-center gap-1">
                {#each row.child.workSuitabilities as work (work.workType)}
                  <button
                    class="flex cursor-pointer items-center"
                    title="{work.workType} Lv{work.level}"
                    onclick={() => toggleWorkType(work.workType)}
                  >
                    <img
                      src="/icons/work/{work.workType.toLowerCase().replace(/ /g, '-')}.webp"
                      alt={work.workType}
                      class="size-5"
                    />
                    <span class="text-muted-foreground">{work.level}</span>
                  </button>
                {/each}
              </div>
            </Table.Cell>
            <Table.Cell>
              {#if row.child.mounts.length > 0}
                <div class="flex items-center gap-0.5">
                  {#each row.child.mounts as mount (mount.type)}
                    <button
                      type="button"
                      class="cursor-pointer"
                      onclick={() => toggleMount(mount.type)}
                    >
                      <img
                        src="/icons/mounts/{mount.type.toLowerCase()}.svg"
                        alt={mount.type}
                        class="size-5"
                      />
                    </button>
                  {/each}
                  <span class="text-muted-foreground">{row.child.mounts[0].unlockLevel}</span>
                </div>
              {/if}
            </Table.Cell>
            <Table.Cell>{row.child.stats?.rarity ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.slowWalkSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.walkSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.runSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.rideSprintSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.transportSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.swimSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.swimDashSpeed ?? ""}</Table.Cell>
            <Table.Cell>{row.child.movement?.stamina ?? ""}</Table.Cell>
            <Table.Cell>{row.child.stats?.health ?? ""}</Table.Cell>
            <Table.Cell>{row.child.stats?.attack ?? ""}</Table.Cell>
            <Table.Cell>{row.child.stats?.defense ?? ""}</Table.Cell>
            <Table.Cell>{row.child.stats?.food ?? ""}</Table.Cell>
            <Table.Cell>{row.child.stats?.price ?? ""}</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
</div>
