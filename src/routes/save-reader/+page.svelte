<script lang="ts">
  import { onMount } from "svelte";
  import type { ExtractedPal } from "$lib/server/save_reader/save_reader";
  import PalCard from "$lib/components/PalCard.svelte";
  import type { PassiveSkillData } from "$lib/components/PalPassiveBadge.svelte";

  let loading = $state(true);
  let error = $state<string | null>(null);
  let pals = $state<ExtractedPal[]>([]);
  let passivesMap = $state<Record<string, PassiveSkillData>>({});
  let loadedFileName = $state<string>("Level.sav");
  let searchQuery = $state("");
  let selectedGender = $state<"all" | "Male" | "Female">("all");
  let minLevel = $state<number>(1);
  let fileInput: HTMLInputElement | undefined = $state(undefined);

  const filteredPals = $derived(
    pals.filter((pal) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = pal.palName.toLowerCase().includes(q) || pal.characterId.toLowerCase().includes(q);
        const matchesPassive = pal.passives.some((p) => p.toLowerCase().includes(q));
        if (!matchesName && !matchesPassive) return false;
      }
      if (selectedGender !== "all" && pal.gender !== selectedGender) {
        return false;
      }
      if (pal.level < minLevel) {
        return false;
      }
      return true;
    })
  );

  async function loadInitialSaveData() {
    loading = true;
    error = null;
    try {
      const res = await fetch("/api/savegame");
      const data = await res.json();
      if (data.passivesMap) {
        passivesMap = data.passivesMap;
      }
      if (res.ok && data.pals) {
        pals = data.pals;
        loadedFileName = data.savePath ? data.savePath.split("/").pop() || "Level.sav" : "Level.sav";
      }
    } catch (e: any) {
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
        body: formData
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
    } catch (e: any) {
      error = e.message;
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

<div class="w-full px-[10vw] py-6 space-y-5">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-neutral-800 pb-4">
    <div>
      <h1 class="text-2xl font-bold text-white">Save Game Pal Reader</h1>
      <p class="text-sm text-neutral-400">
        Upload your <code class="rounded bg-neutral-800 px-1 py-0.5 text-neutral-200">Level.sav</code> file to view your Pal cards & passive skill badges
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
        onclick={triggerFilePick}
        disabled={loading}
        class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {loading ? "Processing..." : "Upload Level.sav"}
      </button>
    </div>
  </div>

  <!-- Filter Bar (Always visible) -->
  <div class="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3.5">
    <div class="flex-1">
      <label for="search-pals" class="block text-xs font-medium text-neutral-400">Search Pal / Passive</label>
      <input
        id="search-pals"
        type="text"
        bind:value={searchQuery}
        placeholder="e.g. Sibelyx, Babysitter, Immortality..."
        class="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
      />
    </div>

    <div class="w-36">
      <label for="gender-select" class="block text-xs font-medium text-neutral-400">Gender</label>
      <select
        id="gender-select"
        bind:value={selectedGender}
        class="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-neutral-500 focus:outline-none"
      >
        <option value="all">All Genders</option>
        <option value="Male">Male ♂</option>
        <option value="Female">Female ♀</option>
      </select>
    </div>

    <div class="w-28">
      <label for="min-level" class="block text-xs font-medium text-neutral-400">Min Level</label>
      <input
        id="min-level"
        type="number"
        min="1"
        max="55"
        bind:value={minLevel}
        class="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-neutral-500 focus:outline-none"
      />
    </div>
  </div>

  {#if error}
    <div class="rounded border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-400">
      <span class="font-semibold">Error processing file:</span> {error}
    </div>
  {/if}

  <!-- Full Screen Cards Grid View -->
  {#if loading}
    <div class="rounded-lg border border-neutral-800 bg-neutral-950 p-12 text-center text-neutral-500">
      Processing Level.sav file...
    </div>
  {:else if filteredPals.length === 0}
    <div class="rounded-lg border border-neutral-800 bg-neutral-950 p-12 text-center text-neutral-500">
      {#if pals.length === 0}
        No Pals loaded yet. Please click <strong>Upload Level.sav</strong> above to load your save data.
      {:else}
        No Pals found matching your current filters.
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {#each filteredPals as pal}
        <PalCard {pal} {passivesMap} />
      {/each}
    </div>
  {/if}

  {#if !loading && pals.length > 0}
    <div class="flex items-center justify-between text-xs text-neutral-500 pt-2">
      <div>Loaded from: <span class="font-mono text-neutral-300">{loadedFileName}</span></div>
      <div>Showing {filteredPals.length} of {pals.length} Pals</div>
    </div>
  {/if}
</div>
