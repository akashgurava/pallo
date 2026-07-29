<script lang="ts">
	import { onMount } from 'svelte';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FilterSidebar from '$lib/components/FilterSidebar.svelte';
	import {
		filterPals,
		STAT_COLUMNS,
		type FilterLogic,
		type WorkTypeFilter,
		type ElementFilter,
		type MountFilter,
		type StatFilter
	} from '$lib/filters.js';
	import type { PalRow } from '$lib/types.js';

	let palsList = $state<PalRow[]>([]);
	let loading = $state(true);
	let availableElements = $state<{ name: string }[]>([]);
	let availableWorkTypes = $state<{ name: string }[]>([]);
	let sheetOpen = $state(false);

	// Filter state
	let nameQuery = $state('');
	let selectedElements = $state<ElementFilter>(new Set());
	let workTypeFilter = $state<WorkTypeFilter>(new Map());
	let mountFilter = $state<MountFilter>({ types: new Set(), maxLevel: 0 });
	let statFilters = $state<StatFilter[]>([]);
	let elementLogic = $state<FilterLogic>('or');
	let workTypeLogic = $state<FilterLogic>('or');

	// Sorting
	type SortKey =
		| 'id' | 'name' | 'elements' | 'work' | 'mounts'
		| 'size' | 'rarity' | 'hp' | 'atk' | 'def' | 'food' | 'price'
		| 'slow' | 'walk' | 'run' | 'sprint' | 'tpot' | 'swim' | 'dash' | 'stam';
	type SortDir = 'asc' | 'desc';
	let sortKey = $state<SortKey>('id');
	let sortDir = $state<SortDir>('asc');

	const SIZE_ORDER: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };

	function toggleSort(key: SortKey): void {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function sortIndicator(key: SortKey): string {
		if (sortKey !== key) return '';
		return sortDir === 'asc' ? ' ▲' : ' ▼';
	}

	function getNumericStat(pal: PalRow, key: SortKey): number | null {
		switch (key) {
			case 'rarity': return pal.stats?.rarity ?? null;
			case 'hp': return pal.stats?.health ?? null;
			case 'atk': return pal.stats?.attack ?? null;
			case 'def': return pal.stats?.defense ?? null;
			case 'food': return pal.stats?.food ?? null;
			case 'price': return pal.stats?.price ?? null;
			case 'slow': return pal.movement?.slowWalkSpeed ?? null;
			case 'walk': return pal.movement?.walkSpeed ?? null;
			case 'run': return pal.movement?.runSpeed ?? null;
			case 'sprint': return pal.movement?.rideSprintSpeed ?? null;
			case 'tpot': return pal.movement?.transportSpeed ?? null;
			case 'swim': return pal.movement?.swimSpeed ?? null;
			case 'dash': return pal.movement?.swimDashSpeed ?? null;
			case 'stam': return pal.movement?.stamina ?? null;
			default: return null;
		}
	}

	// Filter + sort
	let filtered = $derived(
		filterPals(palsList, {
			nameQuery,
			selectedElements,
			workTypeFilter,
			mountFilter,
			statFilters,
			elementLogic,
			workTypeLogic
		})
	);

	function workSortValue(pal: PalRow): number {
		const activeFilters = [...workTypeFilter.entries()].filter(([, lvl]) => lvl > 0);
		if (activeFilters.length === 0) {
			// No filter: sum of all work levels
			return pal.workSuitabilities.reduce((sum, w) => sum + w.level, 0);
		}
		const selectedNames = activeFilters.map(([name]) => name);
		const matchingLevels = pal.workSuitabilities
			.filter((w) => selectedNames.includes(w.workType))
			.map((w) => w.level);

		if (workTypeLogic === 'and') {
			// AND mode: sum of selected work levels
			return matchingLevels.reduce((sum, l) => sum + l, 0);
		} else {
			// OR mode: max of selected work levels
			return matchingLevels.length > 0 ? Math.max(...matchingLevels) : 0;
		}
	}

	let sorted = $derived.by(() => {
		const list = [...filtered];
		list.sort((a, b) => {
			// Mounts: no-mount pals always at the end regardless of direction
			if (sortKey === 'mounts') {
				const aHas = a.mounts.length > 0;
				const bHas = b.mounts.length > 0;
				if (aHas && !bHas) return -1;
				if (!aHas && bHas) return 1;
				if (!aHas && !bHas) return 0;
				const aLevel = Math.min(...a.mounts.map((m) => m.unlockLevel));
				const bLevel = Math.min(...b.mounts.map((m) => m.unlockLevel));
				return sortDir === 'asc' ? aLevel - bLevel : bLevel - aLevel;
			}

			// Size: sort by size order, nulls last
			if (sortKey === 'size') {
				const aSize = SIZE_ORDER[a.stats?.size ?? ''] ?? -1;
				const bSize = SIZE_ORDER[b.stats?.size ?? ''] ?? -1;
				if (aSize === -1 && bSize === -1) return 0;
				if (aSize === -1) return 1;
				if (bSize === -1) return -1;
				const cmp = aSize - bSize;
				return sortDir === 'asc' ? cmp : -cmp;
			}

			// Numeric stat columns
			const aNum = getNumericStat(a, sortKey);
			const bNum = getNumericStat(b, sortKey);
			if (aNum !== null || bNum !== null) {
				if (aNum === null && bNum === null) return 0;
				if (aNum === null) return 1;
				if (bNum === null) return -1;
				const cmp = aNum - bNum;
				return sortDir === 'asc' ? cmp : -cmp;
			}

			let cmp = 0;
			switch (sortKey) {
				case 'id':
					cmp = a.id - b.id;
					break;
				case 'name':
					cmp = a.name.localeCompare(b.name);
					break;
				case 'elements':
					cmp = a.elements.length - b.elements.length;
					break;
				case 'work':
					cmp = workSortValue(a) - workSortValue(b);
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return list;
	});

	let activeFilterCount = $derived(
		(nameQuery.length > 0 ? 1 : 0) +
			selectedElements.size +
			[...workTypeFilter.values()].filter((v) => v > 0).length +
			mountFilter.types.size +
			(mountFilter.maxLevel > 0 ? 1 : 0) +
			statFilters.length
	);

	// Filter actions
	function toggleElement(name: string): void {
		const next = new Set(selectedElements);
		if (next.has(name)) {
			next.delete(name);
		} else {
			next.add(name);
		}
		selectedElements = next;
	}

	function setWorkTypeLevel(name: string, level: number): void {
		const next = new Map(workTypeFilter);
		if (level === 0) {
			next.delete(name);
		} else {
			next.set(name, level);
		}
		workTypeFilter = next;
	}

	function toggleMountType(type: string): void {
		const next = new Set(mountFilter.types);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		mountFilter = { ...mountFilter, types: next };
	}

	function setMountMaxLevel(level: number): void {
		mountFilter = { ...mountFilter, maxLevel: level };
	}

	function addStatFilter(): void {
		statFilters = [...statFilters, { column: 'rarity', op: '>=', value: 1 }];
	}

	function updateStatFilter(index: number, filter: StatFilter): void {
		const next = [...statFilters];
		next[index] = filter;
		statFilters = next;
	}

	function removeStatFilter(index: number): void {
		statFilters = statFilters.filter((_, i) => i !== index);
	}

	function clearFilters(): void {
		nameQuery = '';
		selectedElements = new Set();
		workTypeFilter = new Map();
		mountFilter = { types: new Set(), maxLevel: 0 };
		statFilters = [];
	}

	async function fetchPals(): Promise<void> {
		try {
			const res = await fetch('/api/pals');
			if (res.ok) {
				palsList = await res.json();
			} else {
				console.error(`Failed to fetch pals: ${res.status}`);
			}
		} catch (err) {
			console.error('Failed to fetch pals:', err);
		} finally {
			loading = false;
		}
	}

	async function fetchFilters(): Promise<void> {
		try {
			const res = await fetch('/api/filters');
			if (res.ok) {
				const data = await res.json();
				availableElements = data.elements;
				availableWorkTypes = data.workTypes;
			}
		} catch (err) {
			console.error('Failed to fetch filters:', err);
		}
	}

	onMount(() => {
		fetchPals();
		fetchFilters();
	});

	const filterProps = $derived({
		elements: availableElements,
		workTypes: availableWorkTypes,
		nameQuery,
		selectedElements,
		workTypeFilter,
		mountFilter,
		statFilters,
		elementLogic,
		workTypeLogic,
		onNameChange: (q: string) => (nameQuery = q),
		onToggleElement: toggleElement,
		onSetWorkTypeLevel: setWorkTypeLevel,
		onToggleMountType: toggleMountType,
		onSetMountMaxLevel: setMountMaxLevel,
		onAddStatFilter: addStatFilter,
		onUpdateStatFilter: updateStatFilter,
		onRemoveStatFilter: removeStatFilter,
		onSetElementLogic: (l: FilterLogic) => (elementLogic = l),
		onSetWorkTypeLogic: (l: FilterLogic) => (workTypeLogic = l),
		onClear: clearFilters
	});
</script>

<div class="flex h-full">
	<!-- Desktop sidebar -->
	<aside class="hidden w-80 shrink-0 overflow-y-auto border-r border-border md:block">
		<FilterSidebar {...filterProps} />
	</aside>

	<!-- Main content -->
	<div class="flex-1 overflow-auto">
		<div class="px-4 pt-4">
			<!-- Mobile filter button -->
			<div class="mb-4 md:hidden">
				<Sheet.Root bind:open={sheetOpen}>
					<Sheet.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="outline" size="sm">
								Filters{#if activeFilterCount > 0}&nbsp;({activeFilterCount}){/if}
							</Button>
						{/snippet}
					</Sheet.Trigger>
					<Sheet.Content side="left" class="w-80 overflow-y-auto p-0">
						<Sheet.Header class="sr-only">
							<Sheet.Title>Filters</Sheet.Title>
						</Sheet.Header>
						<FilterSidebar {...filterProps} />
					</Sheet.Content>
				</Sheet.Root>
			</div>

			{#if loading}
				<div class="text-sm text-muted-foreground">Loading...</div>
			{:else if palsList.length === 0}
				<div class="text-sm text-muted-foreground">
					No pals found. Try refreshing the database from the Home page.
				</div>
			{:else}
				<div class="mb-2 text-sm text-muted-foreground">
					{sorted.length}/{palsList.length} pals
				</div>
				<div class="overflow-x-auto rounded-md border border-neutral-800">
					<Table.Root class="text-xs">
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-12 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('id')}>#{sortIndicator('id')}</Table.Head>
								<Table.Head class="w-28 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('name')}>Name{sortIndicator('name')}</Table.Head>
								<Table.Head class="w-36 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('work')}>Work{sortIndicator('work')}</Table.Head>
								<Table.Head class="w-10 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('size')}>Size{sortIndicator('size')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('rarity')}>Rar{sortIndicator('rarity')}</Table.Head>
								<Table.Head class="w-14 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('mounts')}>Mount{sortIndicator('mounts')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('slow')}>Slow{sortIndicator('slow')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('walk')}>Walk{sortIndicator('walk')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('run')}>Run{sortIndicator('run')}</Table.Head>
								<Table.Head class="w-10 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('sprint')}>Sprint{sortIndicator('sprint')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('tpot')}>TPot{sortIndicator('tpot')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('swim')}>Swim{sortIndicator('swim')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('dash')}>Dash{sortIndicator('dash')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('stam')}>Stam{sortIndicator('stam')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('hp')}>HP{sortIndicator('hp')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('atk')}>ATK{sortIndicator('atk')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('def')}>DEF{sortIndicator('def')}</Table.Head>
								<Table.Head class="w-8 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('food')}>Food{sortIndicator('food')}</Table.Head>
								<Table.Head class="w-10 cursor-pointer select-none px-1 text-center" onclick={() => toggleSort('price')}>Coin{sortIndicator('price')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each sorted as pal (pal.id)}
								<Table.Row>
									<Table.Cell class="px-1 font-mono text-muted-foreground">
										{pal.number}{pal.variant ?? ''}
									</Table.Cell>
									<Table.Cell class="px-1 font-medium">
										<div class="flex items-center gap-0.5">
											<span class="whitespace-nowrap">{pal.name}</span>
											{#each pal.elements as element}
												<button
													onclick={() => toggleElement(element)}
													class="cursor-pointer"
													title={element}
												>
													<img
														src="/icons/elements/{element.toLowerCase()}.webp"
														alt={element}
														class="size-4"
													/>
												</button>
											{/each}
										</div>
									</Table.Cell>
									<Table.Cell class="px-1">
										<div class="flex flex-wrap gap-0.5">
											{#each pal.workSuitabilities as ws}
												<button
													onclick={() => setWorkTypeLevel(ws.workType, (workTypeFilter.get(ws.workType) ?? 0) > 0 ? 0 : 1)}
													class="flex cursor-pointer items-center rounded bg-neutral-800/60 px-0.5"
													title="{ws.workType} Lv.{ws.level}"
												>
													<img
														src="/icons/work/{ws.workType.toLowerCase().replace(/ /g, '-')}.webp"
														alt={ws.workType}
														class="size-6"
													/>
													<span class="text-xs font-bold">{ws.level}</span>
												</button>
											{/each}
										</div>
									</Table.Cell>
									<Table.Cell class="px-1 text-center text-muted-foreground">{pal.stats?.size ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.rarity ?? '-'}</Table.Cell>
									<Table.Cell class="px-1">
										{#if pal.mounts.length > 0}
											<div class="flex items-center gap-0.5">
												{#each pal.mounts as mount}
													<button
														onclick={() => toggleMountType(mount.type)}
														class="cursor-pointer"
														title={mount.type}
													>
														<img
															src="/icons/mounts/{mount.type.toLowerCase()}.svg"
															alt={mount.type}
															class="size-4"
														/>
													</button>
												{/each}
												<span class="text-muted-foreground">{pal.mounts[0].unlockLevel}</span>
											</div>
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.slowWalkSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.walkSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.runSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.rideSprintSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.transportSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.swimSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.swimDashSpeed ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.movement?.stamina ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.health ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.attack ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.defense ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.food ?? '-'}</Table.Cell>
									<Table.Cell class="px-1 text-center tabular-nums">{pal.stats?.price ?? '-'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
				<div class="pb-4"></div>
			{/if}
		</div>
	</div>
</div>
