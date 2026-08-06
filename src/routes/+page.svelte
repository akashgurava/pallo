<script lang="ts">
  import { onMount } from "svelte";
  import RefreshSection from "$lib/components/RefreshSection.svelte";
  import type { Stats } from "$lib/types";

  let stats = $state<Stats>({
    totalPals: 0,
    failedPals: 0,
    failedPalNames: [],
    elementCounts: {},
    workTypeCounts: {},
    mountCounts: {},
    breedingCombos: 0,
    breedingMissing: 0,
    breedingMissingNames: [],
    totalPassives: 0,
    implantPassives: 0,
    worldTreePassives: 0,
    mutationPassives: 0,
    lastRefresh: null,
  });

  let refreshingSection = $state<string | null>(null);
  let sectionProgress = $state<Record<string, number>>({
    pals: 0,
    breeding: 0,
  });

  async function fetchStats(): Promise<void> {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        stats = await res.json();
      } else {
        console.error(`Failed to fetch stats: ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }

  async function refreshSection(target: "pals" | "breeding"): Promise<void> {
    if (refreshingSection) return;
    refreshingSection = target;
    sectionProgress[target] = 0;

    try {
      const res = await fetch(`/api/refresh?target=${target}`, { method: "POST" });
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (typeof event.progress === "number" && event.progress >= 0) {
              sectionProgress[target] = event.progress;
            }
            if (event.done) {
              sectionProgress[target] = 100;
              await fetchStats();
            }
          } catch (e) {
            console.error("Error parsing SSE JSON:", e);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to refresh ${target}:`, err);
    } finally {
      refreshingSection = null;
    }
  }

  const defaultElements = [
    "Fire",
    "Water",
    "Grass",
    "Electric",
    "Ice",
    "Ground",
    "Dark",
    "Dragon",
    "Neutral",
  ];

  const defaultWorkTypes = [
    "Kindling",
    "Watering",
    "Planting",
    "Generating Electricity",
    "Handiwork",
    "Gathering",
    "Lumbering",
    "Mining",
    "Medicine Production",
    "Cooling",
    "Transporting",
    "Farming",
  ];

  onMount(() => {
    fetchStats();
  });
</script>

<div class="mx-auto h-full max-w-5xl px-6 pt-8 pb-12">
  <div class="space-y-8">
    <!-- Top Summary Row: Merged Pals & Mounts (Box 1) and Breeding (Box 2) -->
    <div class="grid grid-cols-2 gap-4">
      <!-- 1. Merged Pals & Mounts Box -->
      <div
        class="relative flex h-28 flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold tracking-wider text-neutral-400 uppercase">Pals & Mounts</h2>
          <button
            type="button"
            title="Refresh Pals, Stats & Mounts"
            onclick={() => refreshSection("pals")}
            disabled={refreshingSection !== null}
            class="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30"
          >
            <svg
              class="size-3.5 {refreshingSection === 'pals' ? 'animate-spin text-sky-400' : ''}"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-5 gap-2">
          <!-- Total Pals -->
          <div class="text-center">
            <div class="text-2xl font-extrabold text-white">{stats.totalPals}</div>
            <div class="text-[11px] font-medium text-neutral-400">Total</div>
          </div>

          <!-- Stats Missing with Hover Tooltip Popover -->
          <div class="group relative text-center">
            <div
              class="text-2xl font-extrabold"
              class:text-red-400={stats.failedPals > 0}
              class:text-white={stats.failedPals === 0}
            >
              {stats.failedPals}
            </div>
            <div
              class="flex cursor-default items-center justify-center gap-1 text-[11px] font-medium text-neutral-400"
            >
              <span>Stats Missing</span>
              {#if stats.failedPals > 0}
                <span
                  class="rounded border border-red-800/60 bg-red-950 px-1 text-[9px] font-bold text-red-400"
                  >?</span
                >
              {/if}
            </div>

            <!-- Styled Popover list on hover -->
            {#if stats.failedPals > 0}
              <div
                class="absolute top-full left-1/2 z-50 hidden -translate-x-1/2 pt-1 group-hover:block"
              >
                <div
                  class="pointer-events-auto w-52 rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-xs text-neutral-200 shadow-2xl"
                >
                  <div
                    class="mb-1 flex items-center justify-between border-b border-neutral-800 pb-1 font-bold text-red-400"
                  >
                    <span>Missing Stats</span>
                    <span class="font-mono text-[10px] text-neutral-400"
                      >{stats.failedPals} Pals</span
                    >
                  </div>
                  <div
                    class="max-h-36 space-y-0.5 overflow-y-auto text-left font-mono text-[11px] leading-relaxed text-neutral-300"
                  >
                    {#each stats.failedPalNames as pName (pName)}
                      <div>• {pName}</div>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Ground Mounts -->
          <div class="border-l border-neutral-800/60 pl-2 text-center">
            <div class="text-2xl font-extrabold text-white">{stats.mountCounts["Ground"] || 0}</div>
            <div class="text-[11px] font-medium text-neutral-400">Ground</div>
          </div>

          <!-- Flying Mounts -->
          <div class="text-center">
            <div class="text-2xl font-extrabold text-white">{stats.mountCounts["Flying"] || 0}</div>
            <div class="text-[11px] font-medium text-neutral-400">Flying</div>
          </div>

          <!-- Water Mounts -->
          <div class="text-center">
            <div class="text-2xl font-extrabold text-white">{stats.mountCounts["Water"] || 0}</div>
            <div class="text-[11px] font-medium text-neutral-400">Water</div>
          </div>
        </div>

        <!-- Sleek Bottom Progress Bar -->
        {#if refreshingSection === "pals"}
          <div class="absolute right-0 bottom-0 left-0 h-1 overflow-hidden bg-neutral-800">
            <div
              class="h-full bg-sky-500 transition-all duration-300 ease-out"
              style="width: {sectionProgress['pals']}%"
            ></div>
          </div>
        {/if}
      </div>

      <!-- 2. Breeding Box -->
      <div
        class="relative flex h-28 flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold tracking-wider text-neutral-400 uppercase">Breeding</h2>
          <button
            type="button"
            title="Refresh Breeding"
            onclick={() => refreshSection("breeding")}
            disabled={refreshingSection !== null}
            class="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30"
          >
            <svg
              class="size-3.5 {refreshingSection === 'breeding' ? 'animate-spin text-sky-400' : ''}"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-extrabold text-white">{stats.breedingCombos}</div>
            <div class="text-[11px] font-medium text-neutral-400">Combinations</div>
          </div>

          <!-- Breeding Missing with Hover Tooltip Popover -->
          <div class="group relative text-center">
            <div
              class="text-2xl font-extrabold"
              class:text-red-400={stats.breedingMissing > 0}
              class:text-white={stats.breedingMissing === 0}
            >
              {stats.breedingMissing}
            </div>
            <div
              class="flex cursor-default items-center justify-center gap-1 text-[11px] font-medium text-neutral-400"
            >
              <span>Breeding Missing</span>
              {#if stats.breedingMissing > 0}
                <span
                  class="rounded border border-red-800/60 bg-red-950 px-1 text-[9px] font-bold text-red-400"
                  >?</span
                >
              {/if}
            </div>

            <!-- Styled Popover list on hover -->
            {#if stats.breedingMissing > 0}
              <div
                class="absolute top-full left-1/2 z-50 hidden -translate-x-1/2 pt-1 group-hover:block"
              >
                <div
                  class="pointer-events-auto w-52 rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-xs text-neutral-200 shadow-2xl"
                >
                  <div
                    class="mb-1 flex items-center justify-between border-b border-neutral-800 pb-1 font-bold text-red-400"
                  >
                    <span>Missing Breeding</span>
                    <span class="font-mono text-[10px] text-neutral-400"
                      >{stats.breedingMissing} Pals</span
                    >
                  </div>
                  <div
                    class="max-h-36 space-y-0.5 overflow-y-auto text-left font-mono text-[11px] leading-relaxed text-neutral-300"
                  >
                    {#each stats.breedingMissingNames ?? [] as pName (pName)}
                      <div>• {pName}</div>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Sleek Bottom Progress Bar -->
        {#if refreshingSection === "breeding"}
          <div class="absolute right-0 bottom-0 left-0 h-1 overflow-hidden bg-neutral-800">
            <div
              class="h-full bg-sky-500 transition-all duration-300 ease-out"
              style="width: {sectionProgress['breeding']}%"
            ></div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Elements Section (Fixed 9-column layout) -->
    <section class="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 class="text-xs font-bold tracking-wider text-neutral-400 uppercase">Elements</h2>
      <div class="grid grid-cols-9 gap-2">
        {#each defaultElements as elName (elName)}
          <div
            class="flex items-center justify-center gap-2 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-2"
            title={elName}
          >
            <img
              src="/icons/elements/{elName.toLowerCase()}.webp"
              alt={elName}
              class="size-7 shrink-0"
            />
            <span class="text-sm font-bold text-white">{stats.elementCounts[elName] || 0}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Work Suitability Section (Fixed 6-column layout) -->
    <section class="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 class="text-xs font-bold tracking-wider text-neutral-400 uppercase">Work Suitability</h2>
      <div class="grid grid-cols-6 gap-2.5">
        {#each defaultWorkTypes as workName (workName)}
          <div
            class="flex items-center gap-2.5 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-2"
            title={workName}
          >
            <img
              src="/icons/work/{workName.toLowerCase().replace(/ /g, '-')}.webp"
              alt={workName}
              class="size-6 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[11px] font-medium text-neutral-400">{workName}</div>
              <div class="text-xs font-bold text-white">{stats.workTypeCounts[workName] || 0}</div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Passive Skills Section (Fixed 4-column layout) -->
    <section class="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 class="text-xs font-bold tracking-wider text-neutral-400 uppercase">Passive Skills</h2>
      <div class="grid grid-cols-4 gap-4">
        <div class="rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-center">
          <div class="text-2xl font-extrabold text-white">{stats.totalPassives}</div>
          <div class="text-xs font-medium text-neutral-400">Total Passives</div>
        </div>
        <div class="rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-center">
          <div class="text-2xl font-extrabold text-purple-400">{stats.implantPassives}</div>
          <div class="text-xs font-medium text-neutral-400">Implants</div>
        </div>
        <div class="rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-center">
          <div class="text-2xl font-extrabold text-emerald-400">{stats.worldTreePassives}</div>
          <div class="text-xs font-medium text-neutral-400">World Tree</div>
        </div>
        <div class="rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 text-center">
          <div class="text-2xl font-extrabold text-amber-400">{stats.mutationPassives}</div>
          <div class="text-xs font-medium text-neutral-400">Mutations</div>
        </div>
      </div>
    </section>

    <!-- Full Database Refresh Section -->
    <RefreshSection lastRefresh={stats.lastRefresh} onRefreshComplete={fetchStats} />
  </div>
</div>
