<script lang="ts">
  import { onMount } from "svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import type { PalRow } from "$lib/types.js";
  import ParentsToChild from "./ParentsToChild.svelte";
  import OneParentToChilds from "./OneParentToChilds.svelte";
  import ChildToParents from "./ChildToParents.svelte";
  import { breedingState } from "./breeding-state.svelte.js";

  let palsList = $state<PalRow[]>([]);
  let loading = $state(true);
  let availableElements = $state<string[]>([]);
  let availableWorkTypes = $state<string[]>([]);

  async function fetchPals(): Promise<void> {
    try {
      const res = await fetch("/api/pals");
      if (res.ok) {
        palsList = await res.json();
        breedingState.restore(palsList);
        breedingState.restoreDependentFilters(palsList);
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

<div class="mx-auto flex h-full max-w-360 flex-col px-6 pt-8">
  <Tabs.Root bind:value={breedingState.activeTab}>
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
        <ParentsToChild pals={palsList} bind:parentA={breedingState.parentA} bind:parentB={breedingState.parentB} />
      {/if}
    </Tabs.Content>

    <Tabs.Content value="one-parent" class="min-w-0 pt-6">
      {#if !loading}
        <OneParentToChilds
          pals={palsList}
          {availableElements}
          {availableWorkTypes}
          bind:singleParent={breedingState.singleParent}
          bind:parentBFilter={breedingState.parentBFilter}
          bind:childFilter={breedingState.childFilter}
          bind:selectedElements={breedingState.selectedElements}
          bind:selectedWorkTypes={breedingState.selectedWorkTypes}
          bind:selectedMounts={breedingState.selectedMounts}
        />
      {/if}
    </Tabs.Content>

    <Tabs.Content value="child-parents" class="flex justify-center pt-6">
      {#if !loading}
        <ChildToParents
          pals={palsList}
          {availableElements}
          bind:reverseChild={breedingState.reverseChild}
          bind:reverseParentFilter={breedingState.reverseParentFilter}
          bind:reverseElementFilter={breedingState.reverseElementFilter}
        />
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
