<script lang="ts">
	import PalAutocomplete from '$lib/components/PalAutocomplete.svelte';
	import type { PalRow, WorkSuitability, MountInfo, PalStatsData, PalMovement } from '$lib/types.js';

	interface BreedingChild {
		id: number;
		number: string;
		variant: string | null;
		name: string;
		elements: string[];
		workSuitabilities: WorkSuitability[];
		mounts: MountInfo[];
		stats: PalStatsData;
		movement: PalMovement;
	}

	let {
		pals,
		parentA = $bindable(),
		parentB = $bindable()
	}: {
		pals: PalRow[];
		parentA: PalRow | null;
		parentB: PalRow | null;
	} = $props();

	let child = $state<BreedingChild | null>(null);
	let lookingUp = $state(false);

	async function lookupChild(): Promise<void> {
		if (!parentA || !parentB) {
			child = null;
			return;
		}
		lookingUp = true;
		try {
			const res = await fetch(`/api/breeding?parent1=${parentA.id}&parent2=${parentB.id}`);
			if (res.ok) {
				const data = await res.json();
				child = data.child ?? null;
			} else {
				child = null;
			}
		} catch (err) {
			console.error('Breeding lookup failed:', err);
			child = null;
		} finally {
			lookingUp = false;
		}
	}

	$effect(() => {
		if (parentA && parentB) {
			lookupChild();
		} else {
			child = null;
		}
	});
</script>

<div class="w-[44rem] space-y-4">
	<div class="flex gap-4">
		<div>
			<span class="mb-1 block text-sm text-muted-foreground">Parent A</span>
			<PalAutocomplete
				pals={pals}
				selected={parentA}
				placeholder="Search..."
				onSelect={(pal) => (parentA = pal)}
			/>
		</div>
		<div>
			<span class="mb-1 block text-sm text-muted-foreground">Parent B</span>
			<PalAutocomplete
				pals={pals}
				selected={parentB}
				placeholder="Search..."
				onSelect={(pal) => (parentB = pal)}
			/>
		</div>
	</div>

	<div class="rounded-md border border-neutral-700 bg-neutral-900 p-4">
		{#if lookingUp}
			<div class="text-sm text-muted-foreground">Looking up...</div>
		{:else if child}
			<div class="space-y-3">
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-sm text-muted-foreground">#{child.number}</span>
					<span class="text-xl font-bold">{child.name}</span>
					{#each child.elements as el}
						<img
							src="/icons/elements/{el.toLowerCase()}.webp"
							alt={el}
							class="size-7"
						/>
					{/each}
					<span class="w-4"></span>
					{#each child.workSuitabilities as work}
						<div class="flex items-center gap-0.5" title="{work.workType} Lv{work.level}">
							<img
								src="/icons/work/{work.workType.toLowerCase().replace(/ /g, '-')}.webp"
								alt={work.workType}
								class="size-8"
							/>
							<span class="text-base text-muted-foreground">{work.level}</span>
						</div>
					{/each}
					{#if child.mounts.length > 0}
						<span class="ml-auto flex items-center gap-2">
							{#each child.mounts as mount}
								<span class="flex items-center gap-0.5">
									<img
										src="/icons/mounts/{mount.type.toLowerCase()}.svg"
										alt={mount.type}
										class="size-7"
										title="{mount.type}"
									/>
									<span class="text-base text-muted-foreground">{mount.unlockLevel}</span>
								</span>
							{/each}
						</span>
					{/if}
				</div>
				<div class="grid grid-cols-14 gap-x-3 text-sm">
					<div class="text-center text-muted-foreground">Rar</div>
					<div class="text-center text-muted-foreground">Slow</div>
					<div class="text-center text-muted-foreground">Walk</div>
					<div class="text-center text-muted-foreground">Run</div>
					<div class="text-center text-muted-foreground">Sprint</div>
					<div class="text-center text-muted-foreground">TPot</div>
					<div class="text-center text-muted-foreground">Swim</div>
					<div class="text-center text-muted-foreground">Dash</div>
					<div class="text-center text-muted-foreground">Stam</div>
					<div class="text-center text-muted-foreground">HP</div>
					<div class="text-center text-muted-foreground">ATK</div>
					<div class="text-center text-muted-foreground">DEF</div>
					<div class="text-center text-muted-foreground">Food</div>
					<div class="text-center text-muted-foreground">Coin</div>
					<div class="text-center">{child.stats.rarity}</div>
					<div class="text-center">{child.movement.slowWalkSpeed}</div>
					<div class="text-center">{child.movement.walkSpeed}</div>
					<div class="text-center">{child.movement.runSpeed}</div>
					<div class="text-center">{child.movement.rideSprintSpeed}</div>
					<div class="text-center">{child.movement.transportSpeed}</div>
					<div class="text-center">{child.movement.swimSpeed}</div>
					<div class="text-center">{child.movement.swimDashSpeed}</div>
					<div class="text-center">{child.movement.stamina}</div>
					<div class="text-center">{child.stats.health}</div>
					<div class="text-center">{child.stats.attack}</div>
					<div class="text-center">{child.stats.defense}</div>
					<div class="text-center">{child.stats.food}</div>
					<div class="text-center">{child.stats.price}</div>
				</div>
			</div>
		{:else if parentA && parentB}
			<div class="text-sm text-muted-foreground">No breeding combination found</div>
		{:else}
			<div class="text-sm text-muted-foreground">&nbsp;</div>
		{/if}
	</div>
</div>
