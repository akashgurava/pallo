<script lang="ts">
  import type { PalRow } from "$lib/types.js";
  import PalInlineInfo from "$lib/components/PalInlineInfo.svelte";

  let {
    pals,
    selected,
    placeholder,
    onSelect,
  }: {
    pals: PalRow[];
    selected: PalRow | null;
    placeholder: string;
    onSelect: (pal: PalRow | null) => void;
  } = $props();

  let query = $state("");
  let open = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (open && inputEl) {
      inputEl.focus();
    }
  });

  let filtered = $derived(
    open
      ? query.length > 0
        ? pals.filter(
            (p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.number.includes(query),
          )
        : pals
      : [],
  );

  function selectPal(pal: PalRow): void {
    onSelect(pal);
    query = "";
    open = false;
  }

  function handleFocus(): void {
    if (selected) {
      onSelect(null);
      query = "";
    }
    open = true;
  }

  function handleInput(): void {
    open = true;
  }

  function handleBlur(): void {
    setTimeout(() => {
      open = false;
    }, 150);
  }
</script>

<div class="relative w-80">
  {#if selected && !open}
    <button
      type="button"
      class="flex h-10 w-full items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-left text-sm"
      onclick={handleFocus}
    >
      <PalInlineInfo pal={selected} />
    </button>
  {:else}
    <input
      bind:this={inputEl}
      bind:value={query}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      {placeholder}
      class="text-foreground placeholder:text-muted-foreground h-10 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm focus:ring-1 focus:ring-neutral-500 focus:outline-none"
    />
  {/if}
  {#if open && filtered.length > 0}
    <div
      class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg"
    >
      {#each filtered as pal (pal.id)}
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-800"
          onmousedown={() => selectPal(pal)}
        >
          <PalInlineInfo {pal} />
        </button>
      {/each}
    </div>
  {/if}
</div>
