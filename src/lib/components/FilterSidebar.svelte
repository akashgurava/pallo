<script lang="ts">
	import { STAT_COLUMNS, type FilterLogic, type WorkTypeFilter, type ElementFilter, type MountFilter, type StatFilter, type StatOp } from '$lib/filters.js';

	const WORK_COLORS: Record<string, string> = {
		Kindling: 'rgba(245, 158, 66, 0.12)',
		Watering: 'rgba(100, 200, 235, 0.12)',
		Planting: 'rgba(130, 210, 100, 0.12)',
		'Generating Electricity': 'rgba(250, 200, 50, 0.12)',
		Handiwork: 'rgba(230, 195, 150, 0.12)',
		Gathering: 'rgba(160, 210, 80, 0.12)',
		Lumbering: 'rgba(180, 130, 70, 0.12)',
		Mining: 'rgba(170, 160, 220, 0.12)',
		'Medicine Production': 'rgba(120, 190, 80, 0.12)',
		Cooling: 'rgba(140, 210, 240, 0.12)',
		Transporting: 'rgba(190, 160, 110, 0.12)',
		Farming: 'rgba(210, 170, 100, 0.12)'
	};

	const WORK_COLORS_ACTIVE: Record<string, string> = {
		Kindling: 'rgba(245, 158, 66, 0.25)',
		Watering: 'rgba(100, 200, 235, 0.25)',
		Planting: 'rgba(130, 210, 100, 0.25)',
		'Generating Electricity': 'rgba(250, 200, 50, 0.25)',
		Handiwork: 'rgba(230, 195, 150, 0.25)',
		Gathering: 'rgba(160, 210, 80, 0.25)',
		Lumbering: 'rgba(180, 130, 70, 0.25)',
		Mining: 'rgba(170, 160, 220, 0.25)',
		'Medicine Production': 'rgba(120, 190, 80, 0.25)',
		Cooling: 'rgba(140, 210, 240, 0.25)',
		Transporting: 'rgba(190, 160, 110, 0.25)',
		Farming: 'rgba(210, 170, 100, 0.25)'
	};

	const MOUNT_TYPES = ['Ground', 'Flying', 'Water'] as const;

	const MOUNT_COLORS: Record<string, string> = {
		Ground: 'rgba(180, 140, 80, 0.12)',
		Flying: 'rgba(140, 180, 240, 0.12)',
		Water: 'rgba(80, 170, 210, 0.12)'
	};

	const MOUNT_COLORS_ACTIVE: Record<string, string> = {
		Ground: 'rgba(180, 140, 80, 0.25)',
		Flying: 'rgba(140, 180, 240, 0.25)',
		Water: 'rgba(80, 170, 210, 0.25)'
	};

	let {
		elements,
		workTypes,
		nameQuery,
		selectedElements,
		workTypeFilter,
		mountFilter,
		statFilters,
		elementLogic,
		workTypeLogic,
		onNameChange,
		onToggleElement,
		onSetWorkTypeLevel,
		onToggleMountType,
		onSetMountMaxLevel,
		onAddStatFilter,
		onUpdateStatFilter,
		onRemoveStatFilter,
		onSetElementLogic,
		onSetWorkTypeLogic,
		onClear
	}: {
		elements: { name: string }[];
		workTypes: { name: string }[];
		nameQuery: string;
		selectedElements: ElementFilter;
		workTypeFilter: WorkTypeFilter;
		mountFilter: MountFilter;
		statFilters: StatFilter[];
		elementLogic: FilterLogic;
		workTypeLogic: FilterLogic;
		onNameChange: (query: string) => void;
		onToggleElement: (name: string) => void;
		onSetWorkTypeLevel: (name: string, level: number) => void;
		onToggleMountType: (type: string) => void;
		onSetMountMaxLevel: (level: number) => void;
		onAddStatFilter: () => void;
		onUpdateStatFilter: (index: number, filter: StatFilter) => void;
		onRemoveStatFilter: (index: number) => void;
		onSetElementLogic: (logic: FilterLogic) => void;
		onSetWorkTypeLogic: (logic: FilterLogic) => void;
		onClear: () => void;
	} = $props();

	let hasActiveFilters = $derived(
		nameQuery.length > 0 ||
			selectedElements.size > 0 ||
			[...workTypeFilter.values()].some((v) => v > 0) ||
			mountFilter.types.size > 0 ||
			mountFilter.maxLevel > 0 ||
			statFilters.length > 0
	);
</script>

<div class="space-y-6 p-4">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h2>
		{#if hasActiveFilters}
			<button onclick={onClear} class="text-xs text-muted-foreground hover:text-foreground">
				Clear
			</button>
		{/if}
	</div>

	<!-- Name search -->
	<div>
		<input
			type="text"
			placeholder="Search by name..."
			value={nameQuery}
			oninput={(e) => onNameChange(e.currentTarget.value)}
			class="w-full rounded border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
		/>
	</div>

	<!-- Element filters -->
	<div>
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Elements</h3>
			<div class="flex rounded border border-border text-xs">
				<button
					onclick={() => onSetElementLogic('or')}
					class="px-2 py-0.5 transition-colors {elementLogic === 'or'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground'}"
				>
					OR
				</button>
				<button
					onclick={() => onSetElementLogic('and')}
					class="px-2 py-0.5 transition-colors {elementLogic === 'and'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground'}"
				>
					AND
				</button>
			</div>
		</div>
		<div class="flex flex-wrap gap-1">
			{#each elements as element}
				<button
					onclick={() => onToggleElement(element.name)}
					class="rounded p-1.5 transition-colors {selectedElements.has(element.name)
						? 'bg-primary/30 ring-1 ring-primary'
						: 'hover:bg-muted'}"
					title={element.name}
				>
					<img
						src="/icons/elements/{element.name.toLowerCase()}.webp"
						alt={element.name}
						class="size-7"
					/>
				</button>
			{/each}
		</div>
	</div>

	<!-- Work type filters -->
	<div>
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Work Types
			</h3>
			<div class="flex rounded border border-border text-xs">
				<button
					onclick={() => onSetWorkTypeLogic('or')}
					class="px-2 py-0.5 transition-colors {workTypeLogic === 'or'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground'}"
				>
					OR
				</button>
				<button
					onclick={() => onSetWorkTypeLogic('and')}
					class="px-2 py-0.5 transition-colors {workTypeLogic === 'and'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground'}"
				>
					AND
				</button>
			</div>
		</div>
		<div class="grid grid-cols-4 gap-2">
			{#each workTypes as wt}
				{@const level = workTypeFilter.get(wt.name) ?? 0}
				<div
					class="flex items-center gap-0.5 rounded border px-1.5 py-1.5 {level > 0
						? 'border-primary/60'
						: 'border-neutral-700'}"
					style="background-color: {level > 0
						? (WORK_COLORS_ACTIVE[wt.name] ?? 'rgba(255,255,255,0.1)')
						: (WORK_COLORS[wt.name] ?? 'rgba(255,255,255,0.05)')}"
				>
					<button
						onclick={() => onSetWorkTypeLevel(wt.name, level > 0 ? 0 : 1)}
						title={wt.name}
						class="shrink-0 cursor-pointer"
					>
						<img
							src="/icons/work/{wt.name.toLowerCase().replace(/ /g, '-')}.webp"
							alt={wt.name}
							class="size-6"
						/>
					</button>
					<select
						class="h-4 w-6 min-w-0 appearance-none rounded bg-neutral-700 text-center text-[10px] font-medium text-foreground"
						value={level}
						onchange={(e) => onSetWorkTypeLevel(wt.name, parseInt(e.currentTarget.value, 10))}
					>
						<option value="0">-</option>
						{#each Array.from({ length: 10 }, (_, i) => i + 1) as lvl}
							<option value={lvl}>{lvl}</option>
						{/each}
					</select>
				</div>
			{/each}
		</div>
	</div>

	<!-- Mount filters -->
	<div>
		<div class="mb-2">
			<h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mounts</h3>
		</div>
		<div class="grid grid-cols-4 gap-2">
			<div class="flex items-center justify-center rounded border border-neutral-700 bg-neutral-800/50">
				<select
					class="h-full w-full min-w-0 appearance-none bg-transparent text-center text-[10px] font-medium text-foreground"
					value={mountFilter.maxLevel}
					onchange={(e) => onSetMountMaxLevel(parseInt(e.currentTarget.value, 10))}
				>
					<option value="0">-</option>
					{#each Array.from({ length: 15 }, (_, i) => 80 - i * 5) as lvl}
						<option value={lvl}>{lvl}</option>
					{/each}
				</select>
			</div>
			{#each MOUNT_TYPES as mt}
				{@const active = mountFilter.types.has(mt)}
				<button
					onclick={() => onToggleMountType(mt)}
					class="flex items-center justify-center rounded border px-1.5 py-1.5 transition-colors {active
						? 'border-primary/60'
						: 'border-neutral-700'}"
					style="background-color: {active
						? (MOUNT_COLORS_ACTIVE[mt] ?? 'rgba(255,255,255,0.1)')
						: (MOUNT_COLORS[mt] ?? 'rgba(255,255,255,0.05)')}"
					title={mt}
				>
					<img
						src="/icons/mounts/{mt.toLowerCase()}.svg"
						alt={mt}
						class="size-6"
					/>
				</button>
			{/each}
		</div>
	</div>

	<!-- Stat filters -->
	<div>
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stats</h3>
			<button
				onclick={onAddStatFilter}
				class="text-xs text-muted-foreground hover:text-foreground"
			>
				+ Add
			</button>
		</div>
		<div class="space-y-2">
			{#each statFilters as sf, i}
				{@const colDef = STAT_COLUMNS.find((c) => c.key === sf.column) ?? STAT_COLUMNS[0]!}
				<div class="flex items-center gap-1">
					<select
						class="h-6 w-16 min-w-0 appearance-none rounded bg-neutral-700 px-1 text-center text-[10px] font-medium text-foreground"
						value={sf.column}
						onchange={(e) => {
							const newCol = e.currentTarget.value;
							const newDef = STAT_COLUMNS.find((c) => c.key === newCol)!;
							onUpdateStatFilter(i, { column: newCol, op: sf.op, value: newDef.values[0]! });
						}}
					>
						{#each STAT_COLUMNS as col}
							<option value={col.key}>{col.label}</option>
						{/each}
					</select>
					<select
						class="h-6 w-10 min-w-0 appearance-none rounded bg-neutral-700 px-1 text-center text-[10px] font-medium text-foreground"
						value={sf.op}
						onchange={(e) => onUpdateStatFilter(i, { ...sf, op: e.currentTarget.value as StatOp })}
					>
						<option value=">=">≥</option>
						<option value="<=">≤</option>
					</select>
					<select
						class="h-6 w-16 min-w-0 flex-1 appearance-none rounded bg-neutral-700 px-1 text-center text-[10px] font-medium text-foreground"
						value={sf.value}
						onchange={(e) => onUpdateStatFilter(i, { ...sf, value: parseInt(e.currentTarget.value, 10) })}
					>
						{#each colDef.values as v}
							<option value={v}>{v}</option>
						{/each}
					</select>
					<button
						onclick={() => onRemoveStatFilter(i)}
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs text-muted-foreground hover:bg-neutral-700 hover:text-foreground"
					>
						×
					</button>
				</div>
			{/each}
		</div>
	</div>
</div>
