<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import ElementIcon from "./ElementIcon.svelte";
  import WorkTypeIcon from "./WorkTypeIcon.svelte";
  import MountIcon from "./MountIcon.svelte";
  import type { PalRow } from "$lib/types.js";
  import type { WorkTypeFilter } from "$lib/filters.js";

  let {
    pal,
    workTypeFilter,
    expandedRow,
    onToggleElement,
    onSetWorkTypeLevel,
    onToggleMountType,
  }: {
    pal: PalRow;
    workTypeFilter: WorkTypeFilter;
    expandedRow?: import("svelte").Snippet<[PalRow]> | undefined;
    onToggleElement: (name: string) => void;
    onSetWorkTypeLevel: (name: string, level: number) => void;
    onToggleMountType: (type: string) => void;
  } = $props();

  let expanded = $state(false);
</script>

<Table.Row class={expandedRow ? "cursor-pointer hover:bg-neutral-800/40" : ""} onclick={() => expandedRow && (expanded = !expanded)}>
  <Table.Cell class="px-3">
    <div class="flex items-center gap-1">
      {#if expandedRow}
        <span class="text-muted-foreground text-xs transition-transform duration-150 {expanded ? 'rotate-90' : ''}">▶</span>
      {/if}
      <span class="text-muted-foreground font-mono text-xs">{pal.number}{pal.variant ?? ""}</span>
      <span class="whitespace-nowrap px-1 text-sm font-semibold">{pal.name}</span>
      {#each pal.elements as element (element)}
        <ElementIcon
          name={element}
          size="size-5"
          active={false}
          onclick={() => onToggleElement(element)}
        />
      {/each}
    </div>
  </Table.Cell>
  <Table.Cell class="px-1" onclick={(e: MouseEvent) => expandedRow && e.stopPropagation()}>
    <div class="flex flex-wrap gap-0.5">
      {#each pal.workSuitabilities as ws (ws.workType)}
        <button
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            onSetWorkTypeLevel(ws.workType, (workTypeFilter.get(ws.workType) ?? 0) > 0 ? 0 : 1);
          }}
          class="flex cursor-pointer items-center rounded bg-neutral-800/60 px-0.5"
          title="{ws.workType} Lv.{ws.level}"
        >
          <WorkTypeIcon name={ws.workType} />
          <span class="text-xs font-bold">{ws.level}</span>
        </button>
      {/each}
    </div>
  </Table.Cell>
  <Table.Cell class="text-muted-foreground px-1 text-center">{pal.stats?.size ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.rarity ?? "-"}</Table.Cell>
  <Table.Cell class="px-1" onclick={(e: MouseEvent) => expandedRow && e.stopPropagation()}>
    {#if pal.mounts.length > 0}
      <div class="flex items-center gap-0.5">
        {#each pal.mounts as mount (mount.type)}
          <MountIcon
            type={mount.type}
            size="size-4"
            onclick={() => onToggleMountType(mount.type)}
          />
        {/each}
        <span class="text-muted-foreground">{pal.mounts[0]?.unlockLevel}</span>
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  </Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.slowWalkSpeed ?? "-"}</Table.Cell
  >
  <Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.walkSpeed ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.runSpeed ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums"
    >{pal.movement?.rideSprintSpeed ?? "-"}</Table.Cell
  >
  <Table.Cell class="px-1 text-center tabular-nums"
    >{pal.movement?.transportSpeed ?? "-"}</Table.Cell
  >
  <Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.swimSpeed ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.swimDashSpeed ?? "-"}</Table.Cell
  >
  <Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.stamina ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.health ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.attack ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.defense ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.food ?? "-"}</Table.Cell>
  <Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.price ?? "-"}</Table.Cell>
</Table.Row>
{#if expandedRow && expanded}
  <Table.Row class="bg-neutral-950/80 border-b border-neutral-800">
    <Table.Cell colspan={18} class="p-3">
      {@render expandedRow(pal)}
    </Table.Cell>
  </Table.Row>
{/if}
