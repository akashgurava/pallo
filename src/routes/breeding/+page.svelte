<script lang="ts">
  import { onMount } from "svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import type { PalRow } from "$lib/types.js";
  import ParentsToChild from "./ParentsToChild.svelte";
  import OneParentToChilds from "./OneParentToChilds.svelte";
  import ChildToParents from "./ChildToParents.svelte";

  let palsList = $state<PalRow[]>([]);
  let loading = $state(true);
  let availableElements = $state<string[]>([]);
  let availableWorkTypes = $state<string[]>([]);

  // Tab state (persisted)
  let activeTab = $state("parents-child");

  // Parents -> Child state
  let parentA = $state<PalRow | null>(null);
  let parentB = $state<PalRow | null>(null);

  // One Parent -> Childs state
  let singleParent = $state<PalRow | null>(null);
  let childFilter = $state<PalRow | null>(null);
  let selectedElements = $state<Set<string>>(new Set());
  let selectedWorkTypes = $state<Set<string>>(new Set());
  let selectedMounts = $state<Set<string>>(new Set());

  // Child -> Parents state
  let reverseChild = $state<PalRow | null>(null);
  let reverseElementFilter = $state<Set<string>>(new Set());

  // LocalStorage persistence
  const STORAGE_KEY = "pallo:breeding";

  interface StoredState {
    parentAId?: number | undefined;
    parentBId?: number | undefined;
    singleParentId?: number | undefined;
    childFilterId?: number | undefined;
    reverseChildId?: number | undefined;
    elements?: string[] | undefined;
    workTypes?: string[] | undefined;
    mounts?: string[] | undefined;
    reverseElements?: string[] | undefined;
    activeTab?: string | undefined;
  }

  function saveState(): void {
    const state: StoredState = {
      parentAId: parentA?.id,
      parentBId: parentB?.id,
      singleParentId: singleParent?.id,
      childFilterId: childFilter?.id,
      reverseChildId: reverseChild?.id,
      elements: [...selectedElements],
      workTypes: [...selectedWorkTypes],
      mounts: [...selectedMounts],
      reverseElements: [...reverseElementFilter],
      activeTab,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function restoreState(pals: PalRow[]): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state: StoredState = JSON.parse(raw);
      if (state.parentAId) parentA = pals.find((p) => p.id === state.parentAId) ?? null;
      if (state.parentBId) parentB = pals.find((p) => p.id === state.parentBId) ?? null;
      if (state.singleParentId)
        singleParent = pals.find((p) => p.id === state.singleParentId) ?? null;
      if (state.reverseChildId)
        reverseChild = pals.find((p) => p.id === state.reverseChildId) ?? null;
      if (state.elements) selectedElements = new Set(state.elements);
      if (state.workTypes) selectedWorkTypes = new Set(state.workTypes);
      if (state.mounts) selectedMounts = new Set(state.mounts);
      if (state.reverseElements) reverseElementFilter = new Set(state.reverseElements);
      if (state.activeTab) activeTab = state.activeTab;
      // childFilter restore is handled via pending pattern below
      if (state.childFilterId) pendingChildFilterId = state.childFilterId;
    } catch {
      // ignore corrupt storage
    }
  }

  let pendingChildFilterId = $state<number | null>(null);

  $effect(() => {
    void parentA;
    void parentB;
    void singleParent;
    void childFilter;
    void reverseChild;
    void selectedElements;
    void selectedWorkTypes;
    void selectedMounts;
    void reverseElementFilter;
    void activeTab;
    if (!loading) saveState();
  });

  // Deferred childFilter restore — wait until OneParentToChilds loads results
  $effect(() => {
    if (pendingChildFilterId && singleParent && palsList.length > 0) {
      // Give the child component time to load results, then restore
      const pal = palsList.find((p) => p.id === pendingChildFilterId);
      if (pal) childFilter = pal;
      pendingChildFilterId = null;
    }
  });

  async function fetchPals(): Promise<void> {
    try {
      const res = await fetch("/api/pals");
      if (res.ok) {
        palsList = await res.json();
        restoreState(palsList);
      }
    } catch (err) {
      console.error("Failed to fetch pals:", err);
    } finally {
      loading = false;
    }
  }

  async function fetchFilters(): Promise<void> {
    try {
      const res = await fetch("/api/filters");
      if (res.ok) {
        const data = await res.json();
        availableElements = data.elements.map((e: { name: string }) => e.name);
        availableWorkTypes = data.workTypes.map((w: { name: string }) => w.name);
      }
    } catch (err) {
      console.error("Failed to fetch filters:", err);
    }
  }

  onMount(() => {
    fetchPals();
    fetchFilters();
  });
</script>

<div class="mx-auto flex h-full max-w-[90rem] flex-col px-6 pt-8">
  <Tabs.Root bind:value={activeTab}>
    <div class="flex justify-center">
      <Tabs.List>
        <Tabs.Trigger
          value="parents-child"
          class="data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >Parents &rarr; Child</Tabs.Trigger
        >
        <Tabs.Trigger
          value="one-parent"
          class="data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >One Parent &rarr; Childs</Tabs.Trigger
        >
        <Tabs.Trigger
          value="child-parents"
          class="data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >Child &rarr; Parents</Tabs.Trigger
        >
      </Tabs.List>
    </div>

    <Tabs.Content value="parents-child" class="flex justify-center pt-6">
      {#if !loading}
        <ParentsToChild pals={palsList} bind:parentA bind:parentB />
      {/if}
    </Tabs.Content>

    <Tabs.Content value="one-parent" class="min-w-0 pt-6">
      {#if !loading}
        <OneParentToChilds
          pals={palsList}
          {availableElements}
          {availableWorkTypes}
          bind:singleParent
          bind:childFilter
          bind:selectedElements
          bind:selectedWorkTypes
          bind:selectedMounts
        />
      {/if}
    </Tabs.Content>

    <Tabs.Content value="child-parents" class="flex justify-center pt-6">
      {#if !loading}
        <ChildToParents
          pals={palsList}
          {availableElements}
          bind:reverseChild
          bind:reverseElementFilter
        />
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
