<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import SortableHead from "./SortableHead.svelte";
  import PalTableRow from "./PalTableRow.svelte";
  import type { PalRow } from "$lib/types.js";
  import type { SortKey, SortDir } from "$lib/sorting.js";
  import type { WorkTypeFilter } from "$lib/filters.js";

  let {
    pals,
    sortKey,
    sortDir,
    workTypeFilter,
    expandedRow,
    onToggleSort,
    onToggleElement,
    onSetWorkTypeLevel,
    onToggleMountType,
  }: {
    pals: PalRow[];
    sortKey: SortKey;
    sortDir: SortDir;
    workTypeFilter: WorkTypeFilter;
    expandedRow?: import("svelte").Snippet<[PalRow]> | undefined;
    onToggleSort: (key: SortKey) => void;
    onToggleElement: (name: string) => void;
    onSetWorkTypeLevel: (name: string, level: number) => void;
    onToggleMountType: (type: string) => void;
  } = $props();

  const columns: { key: SortKey; label: string; width: string }[] = [
    { key: "id", label: "Name", width: "w-40" },
    { key: "work", label: "Work", width: "w-36" },
    { key: "size", label: "Size", width: "w-10" },
    { key: "rarity", label: "Rar", width: "w-8" },
    { key: "mounts", label: "Mount", width: "w-14" },
    { key: "slow", label: "Slow", width: "w-8" },
    { key: "walk", label: "Walk", width: "w-8" },
    { key: "run", label: "Run", width: "w-8" },
    { key: "sprint", label: "Sprint", width: "w-10" },
    { key: "tpot", label: "TPot", width: "w-8" },
    { key: "swim", label: "Swim", width: "w-8" },
    { key: "dash", label: "Dash", width: "w-8" },
    { key: "stam", label: "Stam", width: "w-8" },
    { key: "hp", label: "HP", width: "w-8" },
    { key: "atk", label: "ATK", width: "w-8" },
    { key: "def", label: "DEF", width: "w-8" },
    { key: "food", label: "Food", width: "w-8" },
    { key: "price", label: "Coin", width: "w-10" },
  ];
</script>

<div class="overflow-x-auto rounded-md border border-neutral-800">
  <Table.Root class="text-xs">
    <Table.Header>
      <Table.Row>
        {#each columns as col (col.key)}
          <SortableHead
            key={col.key}
            label={col.label}
            {sortKey}
            {sortDir}
            width={col.width}
            onclick={() => onToggleSort(col.key)}
          />
        {/each}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each pals as pal (pal.id)}
        <PalTableRow
          {pal}
          {workTypeFilter}
          {expandedRow}
          {onToggleElement}
          {onSetWorkTypeLevel}
          {onToggleMountType}
        />
      {/each}
    </Table.Body>
  </Table.Root>
</div>
