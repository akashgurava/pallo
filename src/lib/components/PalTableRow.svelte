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
    onToggleElement,
    onSetWorkTypeLevel,
    onToggleMountType,
  }: {
    pal: PalRow;
    workTypeFilter: WorkTypeFilter;
    onToggleElement: (name: string) => void;
    onSetWorkTypeLevel: (name: string, level: number) => void;
    onToggleMountType: (type: string) => void;
  } = $props();
</script>

<Table.Row>
  <Table.Cell class="px-3">
    <div class="flex items-center gap-1">
      <span class="text-muted-foreground font-mono text-xs">{pal.number}{pal.variant ?? ""}</span>
      <span class="whitespace-nowrap text-sm font-medium">{pal.name}</span>
      {#each pal.elements as element (element)}
        <ElementIcon
          name={element}
          size="size-4"
          active={false}
          onclick={() => onToggleElement(element)}
        />
      {/each}
    </div>
  </Table.Cell>
  <Table.Cell class="px-1">
    <div class="flex flex-wrap gap-0.5">
      {#each pal.workSuitabilities as ws (ws.workType)}
        <button
          onclick={() =>
            onSetWorkTypeLevel(ws.workType, (workTypeFilter.get(ws.workType) ?? 0) > 0 ? 0 : 1)}
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
  <Table.Cell class="px-1">
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
