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

  let {
    name,
    info,
    selected = false,
    interactive = false,
    disabled = false,
    onclick,
  }: {
    name: string;
    info?: PassiveSkillData | null | undefined;
    selected?: boolean;
    interactive?: boolean;
    disabled?: boolean;
    onclick?: () => void;
  } = $props();

  const rank = $derived(info?.rank ?? 4);

  const themeConfig = $derived.by(() => {
    if (!name) {
      return {
        box: "border border-dashed border-neutral-800 bg-neutral-950/40 text-neutral-600",
        bar: "",
        accent: "",
      };
    }
    // Diamond tone (Rank 4 & 5)
    if (rank >= 4) {
      return {
        box: "border border-[#18647a] bg-[#0c1e28] text-white shadow-[0_0_8px_rgba(24,100,122,0.3)]",
        bar: "bg-[#38bdf8]",
        accent: "text-[#38bdf8]",
      };
    }
    // Gold tone (Rank 2 & 3)
    if (rank === 2 || rank === 3) {
      return {
        box: "border border-[#a38012] bg-[#221c08] text-white shadow-[0_0_8px_rgba(163,128,18,0.25)]",
        bar: "bg-[#facc15]",
        accent: "text-[#facc15]",
      };
    }
    // Neutral / White Rank 1 tone (Insomnia, Brave, Hard Skin)
    if (rank === 1) {
      return {
        box: "border border-[#384c59] bg-[#121a22] text-white",
        bar: "bg-white",
        accent: "text-white",
      };
    }
    // Negative tone (Rank -1, -2, -3)
    return {
      box: "border border-[#9b2c37] bg-[#220c0e] text-white shadow-[0_0_8px_rgba(155,44,55,0.3)]",
      bar: "bg-[#ef4444]",
      accent: "text-[#ef4444]",
    };
  });

  const description = $derived(info?.description || "");
</script>

{#if !name}
  <!-- Empty Slot -->
  <div
    class="flex h-8.5 w-full items-center justify-between rounded border border-dashed border-neutral-800/80 bg-neutral-950/30 px-2.5 text-[11px] text-neutral-600"
  >
    <span class="text-[10px] italic">- Empty -</span>
  </div>
{:else if interactive}
  <!-- Interactive Selectable Passive Skill Badge Button -->
  <button
    type="button"
    {onclick}
    {disabled}
    title={disabled
      ? `${name} (Not present on any of your Pals)`
      : description
        ? `${name}\n${description}`
        : name}
    class="group relative flex h-8.5 w-full items-center justify-between overflow-hidden rounded border py-1 pr-2.5 pl-3.5 text-left transition {disabled
      ? 'cursor-not-allowed border-neutral-800 bg-neutral-950 opacity-30 grayscale'
      : `${themeConfig.box} hover:brightness-110`} {selected
      ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-neutral-950 brightness-110'
      : ''}"
    style="background-image: repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255, 255, 255, 0.025) 10px, rgba(255, 255, 255, 0.025) 20px);"
  >
    <!-- Left Accent Pill Bar -->
    <div
      class="absolute top-1 bottom-1 left-1 w-[3.5px] rounded-full {disabled
        ? 'bg-neutral-600'
        : themeConfig.bar}"
    ></div>

    <!-- Skill Name -->
    <span
      class="truncate pl-0.5 text-[13px] font-extrabold tracking-tight {disabled
        ? 'text-neutral-500'
        : 'text-white'}">{name}</span
    >

    <!-- Stacked CSS Chevrons Rank Display -->
    <div
      class="flex min-w-4 shrink-0 items-center justify-center {disabled
        ? 'text-neutral-600'
        : themeConfig.accent}"
    >
      {#if rank >= 4}
        <!-- Rank 4/5: 3 CSS Chevrons + '+' -->
        <div class="flex flex-col items-center justify-center -space-y-0.75 pt-1">
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="mt-1 text-[8px] leading-none font-black">+</span>
        </div>
      {:else if rank === 3}
        <!-- Rank 3: 3 CSS Chevrons -->
        <div class="flex flex-col items-center justify-center -space-y-0.75">
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
        </div>
      {:else if rank === 2}
        <!-- Rank 2: 2 CSS Chevrons -->
        <div class="flex flex-col items-center justify-center -space-y-0.75">
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
        </div>
      {:else if rank === 1}
        <!-- Rank 1: 1 CSS Chevron in WHITE -->
        <div class="flex items-center justify-center">
          <span
            class="block h-[8.5px] w-[8.5px] -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
        </div>
      {:else if rank < 0}
        <!-- Negative Ranks: Down Chevrons -->
        <div class="flex flex-col items-center justify-center -space-y-0.75">
          {#each Array(Math.abs(rank)), i (i)}
            <span class="block h-2 w-2 -rotate-45 border-b-[2.5px] border-l-[2.5px] border-current"
            ></span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Hover Tooltip -->
    {#if description && !disabled}
      <div
        class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-60 -translate-x-1/2 rounded border border-neutral-700 bg-neutral-900 p-2 text-xs shadow-xl group-hover:block"
      >
        <div class="mb-0.5 font-bold text-white">{name}</div>
        <div class="text-[11px] leading-normal text-neutral-300">{description}</div>
      </div>
    {/if}
  </button>
{:else}
  <!-- Passive Skill Display Badge -->
  <div
    title={description ? `${name}\n${description}` : name}
    class="group relative flex h-8.5 w-full items-center justify-between overflow-hidden rounded border py-1 pr-2.5 pl-3.5 transition hover:brightness-110 {themeConfig.box}"
    style="background-image: repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255, 255, 255, 0.025) 10px, rgba(255, 255, 255, 0.025) 20px);"
  >
    <!-- Left Accent Pill Bar -->
    <div class="absolute top-1 bottom-1 left-1 w-[3.5px] rounded-full {themeConfig.bar}"></div>

    <!-- Skill Name -->
    <span class="truncate pl-0.5 text-[13px] font-extrabold tracking-tight text-white">{name}</span>

    <!-- Stacked CSS Chevrons Rank Display -->
    <div class="flex min-w-4 shrink-0 items-center justify-center {themeConfig.accent}">
      {#if rank >= 4}
        <!-- Rank 4/5: 3 CSS Chevrons + '+' -->
        <div class="flex flex-col items-center justify-center -space-y-0.75 pt-1">
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="mt-1 text-[8px] leading-none font-black">+</span>
        </div>
      {:else if rank === 3}
        <!-- Rank 3: 3 CSS Chevrons -->
        <div class="flex flex-col items-center justify-center -space-y-0.75">
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
        </div>
      {:else if rank === 2}
        <!-- Rank 2: 2 CSS Chevrons -->
        <div class="flex flex-col items-center justify-center -space-y-0.75">
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
          <span class="block h-2 w-2 -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
        </div>
      {:else if rank === 1}
        <!-- Rank 1: 1 CSS Chevron in WHITE -->
        <div class="flex items-center justify-center">
          <span
            class="block h-[8.5px] w-[8.5px] -rotate-45 border-t-[2.5px] border-r-[2.5px] border-current"
          ></span>
        </div>
      {:else if rank < 0}
        <!-- Negative Ranks: Down Chevrons -->
        <div class="flex flex-col items-center justify-center -space-y-0.75">
          {#each Array(Math.abs(rank)), i (i)}
            <span class="block h-2 w-2 -rotate-45 border-b-[2.5px] border-l-[2.5px] border-current"
            ></span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Hover Tooltip -->
    {#if description}
      <div
        class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-60 -translate-x-1/2 rounded border border-neutral-700 bg-neutral-900 p-2 text-xs shadow-xl group-hover:block"
      >
        <div class="mb-0.5 font-bold text-white">{name}</div>
        <div class="text-[11px] leading-normal text-neutral-300">{description}</div>
      </div>
    {/if}
  </div>
{/if}
