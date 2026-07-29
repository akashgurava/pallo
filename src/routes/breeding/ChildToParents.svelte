<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import PalAutocomplete from '$lib/components/PalAutocomplete.svelte';
	import ElementIcon from '$lib/components/ElementIcon.svelte';
	import type { PalRow } from '$lib/types.js';

	interface ParentPair {
		parent1: { id: number; number: string; name: string; elements: string[] };
		parent2: { id: number; number: string; name: string; elements: string[] };
	}

	let {
		pals,
		availableElements,
		reverseChild = $bindable(),
		reverseElementFilter = $bindable()
	}: {
		pals: PalRow[];
		availableElements: string[];
		reverseChild: PalRow | null;
		reverseElementFilter: Set<string>;
	} = $props();

	let parentPairs = $state<ParentPair[]>([]);
	let lookingUpParents = $state(false);
	let reverseParentFilter = $state<PalRow | null>(null);

	type SortKey = 'parent1' | 'parent2';
	type SortDir = 'asc' | 'desc';
	let sortKey = $state<SortKey>('parent1');
	let sortDir = $state<SortDir>('asc');

	function toggleSort(key: SortKey): void {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function toggleElement(name: string): void {
		const next = new Set(reverseElementFilter);
		if (next.has(name)) next.delete(name); else next.add(name);
		reverseElementFilter = next;
	}

	async function lookupParents(): Promise<void> {
		if (!reverseChild) {
			parentPairs = [];
			return;
		}
		lookingUpParents = true;
		try {
			const res = await fetch(`/api/breeding/parents?child=${reverseChild.id}`);
			if (res.ok) {
				const data = await res.json();
				parentPairs = data.results ?? [];
			} else {
				parentPairs = [];
			}
		} catch (err) {
			console.error('Parents lookup failed:', err);
			parentPairs = [];
		} finally {
			lookingUpParents = false;
		}
	}

	$effect(() => {
		if (reverseChild) {
			lookupParents();
			reverseParentFilter = null;
		} else {
			parentPairs = [];
			reverseParentFilter = null;
		}
	});

	let reverseParentOptions = $derived.by(() => {
		const seen = new Set<number>();
		const options: PalRow[] = [];
		for (const pair of parentPairs) {
			for (const p of [pair.parent1, pair.parent2]) {
				if (!seen.has(p.id)) {
					seen.add(p.id);
					const pal = pals.find((pl) => pl.id === p.id);
					if (pal) options.push(pal);
				}
			}
		}
		return options.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
	});

	let filteredPairs = $derived(
		parentPairs.filter((pair) => {
			if (reverseParentFilter) {
				if (pair.parent1.id !== reverseParentFilter.id && pair.parent2.id !== reverseParentFilter.id) return false;
			}
			if (reverseElementFilter.size > 0) {
				const allEls = [...pair.parent1.elements, ...pair.parent2.elements];
				if (!allEls.some((e) => reverseElementFilter.has(e))) return false;
			}
			return true;
		})
	);

	let sortedPairs = $derived(
		[...filteredPairs].sort((a, b) => {
			const aVal = parseInt(sortKey === 'parent1' ? a.parent1.number : a.parent2.number) || 0;
			const bVal = parseInt(sortKey === 'parent1' ? b.parent1.number : b.parent2.number) || 0;
			return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
		})
	);
</script>

<div class="w-[48rem] space-y-4">
	<div class="flex gap-4">
		<div>
			<span class="mb-1 block text-sm text-muted-foreground">Child</span>
			<PalAutocomplete
				pals={pals}
				selected={reverseChild}
				placeholder="Search child..."
				onSelect={(pal) => (reverseChild = pal)}
			/>
		</div>
		<div>
			<span class="mb-1 block text-sm text-muted-foreground">Filter parent</span>
			<PalAutocomplete
				pals={reverseChild ? reverseParentOptions : []}
				selected={reverseParentFilter}
				placeholder="Filter by parent..."
				onSelect={(pal) => (reverseParentFilter = pal)}
			/>
		</div>
	</div>

	<!-- Element filters -->
	<div class="flex flex-wrap items-center gap-1.5">
		{#each availableElements as el}
			<ElementIcon
				name={el}
				size="size-7"
				active={reverseElementFilter.has(el)}
				onclick={() => toggleElement(el)}
			/>
		{/each}
	</div>

	{#if lookingUpParents}
		<div class="text-sm text-muted-foreground">Looking up...</div>
	{:else if parentPairs.length > 0}
		<div class="text-sm text-muted-foreground">
			{filteredPairs.length}/{parentPairs.length} combinations
		</div>
	{/if}

	<div class="overflow-x-auto rounded-md border border-neutral-800">
		<Table.Root class="text-sm">
			<Table.Header>
				<Table.Row>
					<th
						class="w-1/2 cursor-pointer select-none px-3 text-left text-sm font-medium text-muted-foreground"
						onclick={() => toggleSort('parent1')}
					>
						Parent A{sortKey === 'parent1' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
					</th>
					<th
						class="w-1/2 cursor-pointer select-none px-3 text-left text-sm font-medium text-muted-foreground"
						onclick={() => toggleSort('parent2')}
					>
						Parent B{sortKey === 'parent2' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
					</th>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each sortedPairs as pair, i (i)}
					<Table.Row>
						<Table.Cell class="whitespace-nowrap px-3">
							<div class="flex items-center gap-1.5">
								<span class="text-muted-foreground">#{pair.parent1.number}</span>
								<span>{pair.parent1.name}</span>
								{#each pair.parent1.elements as el}
									<img
										src="/icons/elements/{el.toLowerCase()}.webp"
										alt={el}
										class="size-5 cursor-pointer"
										onclick={() => toggleElement(el)}
									/>
								{/each}
							</div>
						</Table.Cell>
						<Table.Cell class="whitespace-nowrap px-3">
							<div class="flex items-center gap-1.5">
								<span class="text-muted-foreground">#{pair.parent2.number}</span>
								<span>{pair.parent2.name}</span>
								{#each pair.parent2.elements as el}
									<img
										src="/icons/elements/{el.toLowerCase()}.webp"
										alt={el}
										class="size-5 cursor-pointer"
										onclick={() => toggleElement(el)}
									/>
								{/each}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
