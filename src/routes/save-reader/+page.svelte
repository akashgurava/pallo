<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import type { ExtractedPal } from "$lib/server/save_reader/save_reader";
  import type { PalRow } from "$lib/types";
  import PalCard from "$lib/components/PalCard.svelte";
  import PalAutocomplete from "$lib/components/PalAutocomplete.svelte";
  import PalPassiveBadge, { type PassiveSkillData } from "$lib/components/PalPassiveBadge.svelte";

  let loading = $state(true);
  let error = $state<string | null>(null);
  let pals = $state<ExtractedPal[]>([]);
  let palRows = $state<PalRow[]>([]);
  let passivesMap = $state<Record<string, PassiveSkillData>>({});
  let loadedFileName = $state<string>("Level.sav");

  // Filters & Sorting state
  let selectedPal = $state<PalRow | null>(null);
  let selectedPassives = $state<string[]>([]);
  let passiveLogic = $state<"AND" | "OR">("AND");
  let passivePickerOpen = $state(false);
  let passiveSearch = $state("");
  let highIvOnly = $state(false);

  let sortBy = $state<"number" | "name" | "level" | "iv">("number");
  let sortOrder = $state<"asc" | "desc">("asc");
  let fileInput: HTMLInputElement | undefined = $state(undefined);

  const hasActiveFilters = $derived(
    Boolean(selectedPal || selectedPassives.length > 0 || highIvOnly),
  );

  function clearAllFilters() {
    selectedPal = null;
    selectedPassives = [];
    highIvOnly = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && passivePickerOpen) {
      passivePickerOpen = false;
    }
  }

  function handleSortClick(target: "number" | "name" | "level" | "iv") {
    if (sortBy === target) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      sortBy = target;
      sortOrder = target === "iv" || target === "level" ? "desc" : "asc";
    }
  }

  function togglePassiveSelection(passiveName: string) {
    if (selectedPassives.includes(passiveName)) {
      selectedPassives = selectedPassives.filter((p) => p !== passiveName);
    } else {
      selectedPassives = [...selectedPassives, passiveName];
    }
  }

  function parsePalNumber(numStr?: string): { num: number; suffix: string } {
    if (!numStr) return { num: 9999, suffix: "" };
    const match = numStr.replace(/^#/, "").match(/^(\d+)([A-Z]*)$/i);
    if (!match || !match[1]) return { num: 9999, suffix: "" };
    return { num: parseInt(match[1], 10), suffix: match[2] || "" };
  }

  /**
   * Dynamically calculates available passive skill names based on currently active Pal & High-IV filters
   */
  const availablePassiveNamesInSave = $derived.by(() => {
    const set = new SvelteSet<string>();
    for (const pal of pals) {
      // 1. Filter by selected Pal from PalAutocomplete
      if (selectedPal) {
        const matchesPalId = pal.palId !== undefined && pal.palId === selectedPal.id;
        const matchesPalName = pal.palName.toLowerCase() === selectedPal.name.toLowerCase();
        if (!matchesPalId && !matchesPalName) {
          continue;
        }
      }

      // 2. Filter by High IVs (>250 total IVs)
      if (highIvOnly) {
        const totalIv = (pal.hpIv || 0) + (pal.shotIv || pal.attackIv || 0) + (pal.defenseIv || 0);
        if (totalIv <= 250) {
          continue;
        }
      }

      if (pal.passives && Array.isArray(pal.passives)) {
        for (const pName of pal.passives) {
          if (pName) set.add(pName.toLowerCase());
        }
      }
    }
    return set;
  });

  const modalPassivesList = $derived.by(() => {
    const list = Object.values(passivesMap);

    // Sort by owned/active status first, then rank desc, then name
    list.sort((a, b) => {
      const ownedA = availablePassiveNamesInSave.has(a.name.toLowerCase());
      const ownedB = availablePassiveNamesInSave.has(b.name.toLowerCase());
      if (ownedA !== ownedB) return ownedA ? -1 : 1;

      const rankA = a.rank ?? 0;
      const rankB = b.rank ?? 0;
      if (rankA !== rankB) return rankB - rankA;
      return a.name.localeCompare(b.name);
    });

    if (!passiveSearch.trim()) return list;
    const q = passiveSearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)),
    );
  });

  const filteredAndSortedPals = $derived.by(() => {
    let list = pals.filter((pal) => {
      // 1. Filter by selected Pal from PalAutocomplete
      if (selectedPal) {
        const matchesPalId = pal.palId !== undefined && pal.palId === selectedPal.id;
        const matchesPalName = pal.palName.toLowerCase() === selectedPal.name.toLowerCase();
        if (!matchesPalId && !matchesPalName) {
          return false;
        }
      }

      // 2. Filter by selected passive skills
      if (selectedPassives.length > 0) {
        const palPassives = pal.passives.map((p) => p.toLowerCase());
        if (passiveLogic === "AND") {
          const hasAll = selectedPassives.every((sp) => palPassives.includes(sp.toLowerCase()));
          if (!hasAll) return false;
        } else {
          const hasAny = selectedPassives.some((sp) => palPassives.includes(sp.toLowerCase()));
          if (!hasAny) return false;
        }
      }

      // 3. Filter by High IVs (>250 total IVs)
      if (highIvOnly) {
        const totalIv = (pal.hpIv || 0) + (pal.shotIv || pal.attackIv || 0) + (pal.defenseIv || 0);
        if (totalIv <= 250) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => {
      let result = 0;
      if (sortBy === "number") {
        const numA = parsePalNumber(a.number);
        const numB = parsePalNumber(b.number);
        if (numA.num !== numB.num) {
          result = numA.num - numB.num;
        } else {
          result = numA.suffix.localeCompare(numB.suffix);
        }
      } else if (sortBy === "name") {
        result = a.palName.localeCompare(b.palName);
      } else if (sortBy === "level") {
        result = a.level - b.level;
      } else if (sortBy === "iv") {
        const totalIvA = (a.hpIv || 0) + (a.shotIv || a.attackIv || 0) + (a.defenseIv || 0);
        const totalIvB = (b.hpIv || 0) + (b.shotIv || b.attackIv || 0) + (b.defenseIv || 0);
        result = totalIvA - totalIvB;
      }

      return sortOrder === "asc" ? result : -result;
    });
  });

  async function loadInitialSaveData() {
    loading = true;
    error = null;
    try {
      const [palsRes, saveRes] = await Promise.all([fetch("/api/pals"), fetch("/api/savegame")]);

      if (palsRes.ok) {
        palRows = await palsRes.json();
      }

      const data = await saveRes.json();
      if (data.passivesMap) {
        passivesMap = data.passivesMap;
      }
      if (saveRes.ok && data.pals) {
        pals = data.pals;
        loadedFileName = data.savePath
          ? data.savePath.split("/").pop() || "Level.sav"
          : "Level.sav";
      }
    } catch {
      // Ignore initial auto-load errors if no save exists yet
    } finally {
      loading = false;
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    loading = true;
    error = null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/savegame", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.passivesMap) {
        passivesMap = data.passivesMap;
      }
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse uploaded Level.sav file");
      }

      pals = data.pals || [];
      loadedFileName = file.name;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function triggerFilePick() {
    if (fileInput) {
      fileInput.click();
    }
  }

  onMount(() => {
    loadInitialSaveData();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="w-full space-y-5 px-[10vw] py-6">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-neutral-800 pb-4">
    <div>
      <h1 class="text-2xl font-bold text-white">Save Game Pal Reader</h1>
      <p class="text-sm text-neutral-400">
        Upload your <code class="rounded bg-neutral-800 px-1 py-0.5 text-neutral-200"
          >Level.sav</code
        > file to view your Pal cards & passive skill badges
      </p>
    </div>

    <!-- Hidden file input & Upload button -->
    <div>
      <input
        type="file"
        accept=".sav,.gvas"
        bind:this={fileInput}
        onchange={handleFileUpload}
        class="hidden"
      />
      <button
        type="button"
        onclick={triggerFilePick}
        disabled={loading}
        class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        {loading ? "Processing..." : "Upload Level.sav"}
      </button>
    </div>
  </div>

  <!-- Filter Controls Bar -->
  <div
    class="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3.5"
  >
    <div class="flex items-end gap-4">
      <!-- Pal Autocomplete Search Component -->
      <div>
        <span class="mb-1 block text-xs font-medium text-neutral-400">Filter by Pal</span>
        <PalAutocomplete
          pals={palRows}
          selected={selectedPal}
          placeholder="Select or search a Pal..."
          onSelect={(pal) => (selectedPal = pal)}
        />
      </div>

      <!-- Passive Skills Filter Picker Popup Button -->
      <div>
        <span class="mb-1 block text-xs font-medium text-neutral-400">Filter Passives</span>
        <button
          type="button"
          onclick={() => (passivePickerOpen = true)}
          class="flex h-10 items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3.5 text-sm text-white transition hover:bg-neutral-800"
        >
          <svg
            class="size-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>
            {#if selectedPassives.length === 0}
              Select Passives
            {:else}
              {selectedPassives.length} Passive{selectedPassives.length > 1 ? "s" : ""} ({passiveLogic})
            {/if}
          </span>
        </button>
      </div>

      <!-- High IV Filter Toggle Button (>250 Total IVs) -->
      <div>
        <span class="mb-1 block text-xs font-medium text-neutral-400">Stats Filter</span>
        <button
          type="button"
          onclick={() => (highIvOnly = !highIvOnly)}
          class="flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition {highIvOnly
            ? 'border-emerald-500 bg-emerald-950/80 text-emerald-300 shadow-xs'
            : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'}"
        >
          <svg
            class="size-4 {highIvOnly ? 'text-emerald-400' : 'text-neutral-400'}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          High IVs (>250)
        </button>
      </div>

      <!-- Clear All Filters Button (Appears after High IV button) -->
      {#if hasActiveFilters}
        <button
          type="button"
          onclick={clearAllFilters}
          class="h-10 pb-2.5 text-xs font-semibold text-neutral-400 underline transition hover:text-red-400"
        >
          Clear
        </button>
      {/if}
    </div>

    <!-- Stylish Sort Segmented Button Group -->
    <div class="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 p-1">
      <span class="px-2 text-[11px] font-bold tracking-wider text-neutral-500 uppercase"
        >Sort By</span
      >

      <button
        type="button"
        onclick={() => handleSortClick("number")}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition {sortBy ===
        'number'
          ? 'bg-neutral-800 text-white shadow-xs'
          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}"
      >
        <span># Number</span>
        {#if sortBy === "number"}
          <svg
            class="size-3.5 transition-transform {sortOrder === 'desc' ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M5 15l7-7 7 7"
            />
          </svg>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => handleSortClick("name")}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition {sortBy ===
        'name'
          ? 'bg-neutral-800 text-white shadow-xs'
          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}"
      >
        <span>Name</span>
        {#if sortBy === "name"}
          <svg
            class="size-3.5 transition-transform {sortOrder === 'desc' ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M5 15l7-7 7 7"
            />
          </svg>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => handleSortClick("level")}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition {sortBy ===
        'level'
          ? 'bg-neutral-800 text-white shadow-xs'
          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}"
      >
        <span>Level</span>
        {#if sortBy === "level"}
          <svg
            class="size-3.5 transition-transform {sortOrder === 'desc' ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M5 15l7-7 7 7"
            />
          </svg>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => handleSortClick("iv")}
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition {sortBy ===
        'iv'
          ? 'bg-neutral-800 text-white shadow-xs'
          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}"
      >
        <span>IV</span>
        {#if sortBy === "iv"}
          <svg
            class="size-3.5 transition-transform {sortOrder === 'desc' ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M5 15l7-7 7 7"
            />
          </svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Passives Modal Popup -->
  {#if passivePickerOpen}
    <!-- Backdrop button for close -->
    <button
      type="button"
      aria-label="Close passive picker backdrop"
      class="fixed inset-0 z-40 h-full w-full cursor-default bg-black/60 backdrop-blur-xs"
      onclick={() => (passivePickerOpen = false)}
    ></button>

    <div
      class="fixed top-1/2 left-1/2 z-50 w-170 max-w-[92vw] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div class="flex items-center gap-3">
          <h3 class="text-base font-bold text-white">Search & Select Passives</h3>

          <!-- AND / OR Logic Switcher Pill -->
          <div
            class="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-0.5 text-xs"
          >
            <button
              type="button"
              onclick={() => (passiveLogic = "AND")}
              class="rounded-md px-2.5 py-1 font-bold transition {passiveLogic === 'AND'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'}"
            >
              AND (All)
            </button>
            <button
              type="button"
              onclick={() => (passiveLogic = "OR")}
              class="rounded-md px-2.5 py-1 font-bold transition {passiveLogic === 'OR'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'}"
            >
              OR (Any)
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          {#if selectedPassives.length > 0}
            <button
              type="button"
              onclick={() => (selectedPassives = [])}
              class="text-xs font-semibold text-neutral-400 hover:text-neutral-200"
            >
              Clear selected ({selectedPassives.length})
            </button>
          {/if}

          <button
            type="button"
            aria-label="Close dialog"
            onclick={() => (passivePickerOpen = false)}
            class="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search Control -->
      <div>
        <input
          type="search"
          bind:value={passiveSearch}
          placeholder="Search passives..."
          class="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-700 focus:outline-none"
        />
      </div>

      <!-- Passives Grid List (3 Columns) -->
      <div class="grid max-h-96 grid-cols-3 gap-2 overflow-y-auto pr-1">
        {#each modalPassivesList as skill (skill.name)}
          <PalPassiveBadge
            name={skill.name}
            info={skill}
            interactive={true}
            disabled={!availablePassiveNamesInSave.has(skill.name.toLowerCase())}
            selected={selectedPassives.includes(skill.name)}
            onclick={() => togglePassiveSelection(skill.name)}
          />
        {/each}
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between border-t border-neutral-800 pt-3">
        <span class="text-xs text-neutral-400">
          Matching mode: <strong class="text-sky-400">{passiveLogic}</strong>
          ({selectedPassives.length} selected)
        </span>
        <button
          type="button"
          onclick={() => (passivePickerOpen = false)}
          class="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-sky-500"
        >
          Apply Filters
        </button>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="rounded border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-400">
      <span class="font-semibold">Error processing file:</span>
      {error}
    </div>
  {/if}

  <!-- Full Screen Cards Grid View -->
  {#if loading}
    <div
      class="rounded-lg border border-neutral-800 bg-neutral-950 p-12 text-center text-neutral-500"
    >
      Processing Level.sav file...
    </div>
  {:else if filteredAndSortedPals.length === 0}
    <div
      class="rounded-lg border border-neutral-800 bg-neutral-950 p-12 text-center text-neutral-500"
    >
      {#if pals.length === 0}
        No Pals loaded yet. Please click <strong>Upload Level.sav</strong> above to load your save data.
      {:else}
        No Pals found matching your current filter criteria.
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {#each filteredAndSortedPals as pal, idx (idx)}
        <PalCard {pal} {passivesMap} />
      {/each}
    </div>
  {/if}

  {#if !loading && pals.length > 0}
    <div class="flex items-center justify-between pt-2 text-xs text-neutral-500">
      <div>Loaded from: <span class="font-mono text-neutral-300">{loadedFileName}</span></div>
      <div>Showing {filteredAndSortedPals.length} of {pals.length} Pals</div>
    </div>
  {/if}
</div>
