<script lang="ts">
  import PalAutocomplete from "$lib/components/PalAutocomplete.svelte";
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

  let {
    pals,
    parentA = $bindable(),
    parentB = $bindable(),
  }: {
    pals: PalRow[];
    parentA: PalRow | null;
    parentB: PalRow | null;
  } = $props();

  let child = $state<BreedingChild | null>(null);

  $effect(() => {
    if (!parentA || !parentB) {
      child = null;
      return;
    }
    const controller = new AbortController();
    fetch(`/api/breeding?parent1=${parentA.id}&parent2=${parentB.id}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        child = d?.child ?? null;
      })
      .catch((e) => {
        if (e.name !== "AbortError") child = null;
      });
    return () => controller.abort();
  });
</script>

<div class="w-176 space-y-4">
  <div class="flex gap-4">
    <div>
      <span class="text-muted-foreground mb-1 block text-sm">Parent A</span>
      <PalAutocomplete
        {pals}
        selected={parentA}
        placeholder="Search..."
        onSelect={(pal) => (parentA = pal)}
      />
    </div>
    <div>
      <span class="text-muted-foreground mb-1 block text-sm">Parent B</span>
      <PalAutocomplete
        {pals}
        selected={parentB}
        placeholder="Search..."
        onSelect={(pal) => (parentB = pal)}
      />
    </div>
  </div>

  <div class="rounded-md border border-neutral-700 bg-neutral-900 p-4">
    {#if $effect.pending()}
      <div class="text-muted-foreground text-sm">Looking up...</div>
    {:else if child}
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-muted-foreground text-sm">#{child.number}</span>
          <span class="text-xl font-bold">{child.name}</span>
          {#each child.elements as el (el)}
            <img src="/icons/elements/{el.toLowerCase()}.webp" alt={el} class="size-7" />
          {/each}
          <span class="w-4"></span>
          {#each child.workSuitabilities as work (work.workType)}
            <div class="flex items-center gap-0.5" title="{work.workType} Lv{work.level}">
              <img
                src="/icons/work/{work.workType.toLowerCase().replace(/ /g, '-')}.webp"
                alt={work.workType}
                class="size-8"
              />
              <span class="text-muted-foreground text-base">{work.level}</span>
            </div>
          {/each}
          {#if child.mounts.length > 0}
            <span class="ml-auto flex items-center gap-2">
              {#each child.mounts as mount (mount.type)}
                <span class="flex items-center gap-0.5">
                  <img
                    src="/icons/mounts/{mount.type.toLowerCase()}.svg"
                    alt={mount.type}
                    class="size-7"
                    title={mount.type}
                  />
                  <span class="text-muted-foreground text-base">{mount.unlockLevel}</span>
                </span>
              {/each}
            </span>
          {/if}
        </div>
        <div class="grid grid-cols-14 gap-x-3 text-sm">
          <div class="text-muted-foreground text-center">Rar</div>
          <div class="text-muted-foreground text-center">Slow</div>
          <div class="text-muted-foreground text-center">Walk</div>
          <div class="text-muted-foreground text-center">Run</div>
          <div class="text-muted-foreground text-center">Sprint</div>
          <div class="text-muted-foreground text-center">TPot</div>
          <div class="text-muted-foreground text-center">Swim</div>
          <div class="text-muted-foreground text-center">Dash</div>
          <div class="text-muted-foreground text-center">Stam</div>
          <div class="text-muted-foreground text-center">HP</div>
          <div class="text-muted-foreground text-center">ATK</div>
          <div class="text-muted-foreground text-center">DEF</div>
          <div class="text-muted-foreground text-center">Food</div>
          <div class="text-muted-foreground text-center">Coin</div>
          <div class="text-center">{child.stats.rarity}</div>
          <div class="text-center">{child.movement.slowWalkSpeed}</div>
          <div class="text-center">{child.movement.walkSpeed}</div>
          <div class="text-center">{child.movement.runSpeed}</div>
          <div class="text-center">{child.movement.rideSprintSpeed}</div>
          <div class="text-center">{child.movement.transportSpeed}</div>
          <div class="text-center">{child.movement.swimSpeed}</div>
          <div class="text-center">{child.movement.swimDashSpeed}</div>
          <div class="text-center">{child.movement.stamina}</div>
          <div class="text-center">{child.stats.health}</div>
          <div class="text-center">{child.stats.attack}</div>
          <div class="text-center">{child.stats.defense}</div>
          <div class="text-center">{child.stats.food}</div>
          <div class="text-center">{child.stats.price}</div>
        </div>
      </div>
    {:else if parentA && parentB}
      <div class="text-muted-foreground text-sm">No breeding combination found</div>
    {:else}
      <div class="text-muted-foreground text-sm">&nbsp;</div>
    {/if}
  </div>
</div>
