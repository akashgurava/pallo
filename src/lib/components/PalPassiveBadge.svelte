<script lang="ts">
  export interface PassiveSkillData {
    name: string;
    description?: string | null;
    rank?: number;
    hp?: number;
    attack?: number;
    defense?: number;
    workSpeed?: number;
    movement?: number;
    san?: number;
  }

  let { name, info }: { name: string; info?: PassiveSkillData | null | undefined } = $props();

  const rank = $derived(info?.rank ?? 4);

  const themeConfig = $derived.by(() => {
    if (!name) {
      return {
        box: "border border-dashed border-neutral-800 bg-neutral-950/40 text-neutral-600",
        bar: "",
        accent: ""
      };
    }
    if (rank >= 4) {
      return {
        box: "border border-[#16819d] bg-[#09222c] text-white shadow-[0_0_6px_rgba(22,129,157,0.2)]",
        bar: "bg-[#38bdf8]",
        accent: "text-[#38bdf8]"
      };
    }
    if (rank === 3) {
      return {
        box: "border border-[#caa01a] bg-[#241f09] text-white shadow-[0_0_6px_rgba(202,160,26,0.2)]",
        bar: "bg-[#eab308]",
        accent: "text-[#eab308]"
      };
    }
    if (rank === 2) {
      return {
        box: "border border-[#4c657e] bg-[#121c25] text-white",
        bar: "bg-[#64748b]",
        accent: "text-[#94a3b8]"
      };
    }
    if (rank === 1) {
      return {
        box: "border border-[#8a5629] bg-[#1c130b] text-white",
        bar: "bg-[#a16207]",
        accent: "text-[#d97706]"
      };
    }
    return {
      box: "border border-[#9b2c37] bg-[#220c0e] text-white shadow-[0_0_6px_rgba(155,44,55,0.2)]",
      bar: "bg-[#ef4444]",
      accent: "text-[#ef4444]"
    };
  });

  const description = $derived(info?.description || "");
</script>

{#if !name}
  <!-- Empty Slot -->
  <div class="flex h-8 items-center justify-between rounded-sm border border-dashed border-neutral-800/80 bg-neutral-950/30 px-2.5 text-[11px] text-neutral-600">
    <span class="italic text-[10px]">- Empty -</span>
  </div>
{:else}
  <!-- Passive Skill Badge matching reference styling -->
  <div
    title={description ? `${name}\n${description}` : name}
    class="group relative flex h-8.5 items-center justify-between overflow-hidden rounded-sm pl-3 pr-2.5 py-1 transition hover:brightness-110 {themeConfig.box}"
    style="background-image: repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(255, 255, 255, 0.015) 8px, rgba(255, 255, 255, 0.015) 16px);"
  >
    <!-- Left Accent Bar -->
    <div class="absolute left-0 top-0 bottom-0 w-[3.5px] {themeConfig.bar}"></div>

    <!-- Skill Name -->
    <span class="truncate text-xs font-bold tracking-tight text-white">{name}</span>

    <!-- Chevrons Rank Display -->
    <div class="flex items-center justify-end pl-1 shrink-0 {themeConfig.accent}">
      {#if rank >= 4}
        <div class="flex flex-col items-center leading-none">
          <svg class="size-3 -mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <svg class="size-3 -mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <span class="text-[8px] font-extrabold leading-none mt-0.5">+</span>
        </div>
      {:else if rank === 3}
        <div class="flex flex-col items-center leading-none py-0.5">
          <svg class="size-3 -mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </div>
      {:else if rank === 2}
        <div class="flex flex-col items-center leading-none py-0.5">
          <svg class="size-3 -mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </div>
      {:else if rank === 1}
        <div class="flex items-center">
          <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </div>
      {:else if rank < 0}
        <div class="flex flex-col items-center leading-none">
          <svg class="size-3 -mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
          <svg class="size-3 -mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
          <span class="text-[8px] font-extrabold leading-none mt-0.5">-</span>
        </div>
      {/if}
    </div>

    <!-- Hover Tooltip -->
    {#if description}
      <div class="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 w-60 rounded border border-neutral-700 bg-neutral-900 p-2 text-xs shadow-xl group-hover:block z-20">
        <div class="font-bold text-white mb-0.5">{name}</div>
        <div class="text-neutral-300 leading-normal text-[11px]">{description}</div>
      </div>
    {/if}
  </div>
{/if}
