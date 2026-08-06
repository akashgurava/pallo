<script lang="ts">
  import type { ExtractedPal } from "$lib/server/save_reader/save_reader";
  import PalPassiveBadge, { type PassiveSkillData } from "./PalPassiveBadge.svelte";

  let { pal, passivesMap }: { pal: ExtractedPal; passivesMap: Record<string, PassiveSkillData> } = $props();

  // Always display 4 passive slots
  const passiveSlots = $derived.by(() => {
    const slots: string[] = [];
    for (let i = 0; i < 4; i++) {
      slots.push(pal.passives[i] || "");
    }
    return slots;
  });
</script>

<div class="relative flex items-center justify-between rounded-lg border border-[#162838] bg-[#0a1622] p-2.5 text-white shadow-sm transition hover:border-[#253f57] gap-3">
  <!-- Left Side: #, Name, Gender, Level & IVs (No Icon) -->
  <div class="flex flex-col justify-center min-w-[7rem] shrink-0 space-y-1">
    <!-- Header: Number, Name, Gender -->
    <div class="flex items-center gap-1.5">
      {#if pal.number}
        <span class="font-mono text-[11px] font-bold text-sky-400">#{pal.number}</span>
      {/if}
      <h3 class="truncate text-xs font-bold tracking-tight text-white">{pal.palName}</h3>
      <span class="text-xs font-bold ml-auto pl-1">
        {#if pal.gender === "Male"}
          <span class="text-sky-400" title="Male ♂">♂</span>
        {:else if pal.gender === "Female"}
          <span class="text-pink-400" title="Female ♀">♀</span>
        {:else}
          <span class="text-slate-500">{pal.gender}</span>
        {/if}
      </span>
    </div>

    <!-- Subtitle: Level & IVs -->
    <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
      <span class="rounded bg-[#122332] px-1 py-0.2 font-semibold text-slate-200">Lv. {pal.level}</span>
      <span class="font-mono text-[10px]">
        <span class="text-red-400" title="HP IV">{pal.hpIv}</span>/<span class="text-amber-400" title="Attack IV">{pal.shotIv || pal.attackIv}</span>/<span class="text-sky-400" title="Defense IV">{pal.defenseIv}</span>
      </span>
    </div>
  </div>

  <!-- Right Side: 2x2 Grid of Compact Passive Badges -->
  <div class="grid grid-cols-2 gap-1.5 flex-1 min-w-0">
    {#each passiveSlots as passiveName}
      <PalPassiveBadge name={passiveName} info={passivesMap[passiveName]} />
    {/each}
  </div>
</div>
