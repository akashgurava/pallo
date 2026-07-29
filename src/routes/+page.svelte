<script lang="ts">
	import { onMount } from 'svelte';
	import RefreshSection from '$lib/components/RefreshSection.svelte';
	import type { Stats } from '$lib/types.js';

	let stats = $state<Stats>({
		totalPals: 0,
		failedPals: 0,
		failedPalNames: [],
		elementCounts: {},
		workTypeCounts: {},
		mountCounts: {},
		breedingCombos: 0,
		breedingMissing: 0,
		lastRefresh: null
	});

	async function fetchStats(): Promise<void> {
		try {
			const res = await fetch('/api/stats');
			if (res.ok) {
				stats = await res.json();
			} else {
				console.error(`Failed to fetch stats: ${res.status}`);
			}
		} catch (err) {
			console.error('Failed to fetch stats:', err);
		}
	}

	onMount(() => {
		fetchStats();
	});
</script>

<div class="mx-auto h-full max-w-5xl px-6 pt-8">
	<div class="space-y-10">
		<!-- Pals -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Pals
			</h2>
			<div class="h-14">
				{#if stats.totalPals > 0}
					<div class="flex flex-wrap gap-x-8 gap-y-3">
						<div class="text-center">
							<div class="text-4xl font-bold">{stats.totalPals}</div>
							<div class="text-sm text-muted-foreground">Total</div>
						</div>
						<div
							class="text-center"
							title={stats.failedPals > 0 ? stats.failedPalNames.join(', ') : undefined}
							class:cursor-help={stats.failedPals > 0}
						>
							<div class="text-4xl font-bold" class:text-red-400={stats.failedPals > 0}>
								{stats.failedPals}
							</div>
							<div class="text-sm text-muted-foreground">Stats Missing</div>
						</div>
						<div class="text-center">
							<div class="text-4xl font-bold" class:text-red-400={stats.breedingMissing > 0}>
								{stats.breedingMissing}
							</div>
							<div class="text-sm text-muted-foreground">Breeding Missing</div>
						</div>
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">None</div>
				{/if}
			</div>
		</section>

		<!-- Elements -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Elements
			</h2>
			<div class="h-12">
				{#if Object.keys(stats.elementCounts).length > 0}
					<div class="flex flex-wrap justify-between">
						{#each Object.entries(stats.elementCounts) as [name, count] (name)}
							<div class="flex items-center gap-2" title={name}>
								<img
									src="/icons/elements/{name.toLowerCase()}.webp"
									alt={name}
									class="size-10"
								/>
								<div class="text-xl font-bold">{count}</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">None</div>
				{/if}
			</div>
		</section>

		<!-- Work Suitability -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Work Suitability
			</h2>
			<div class="h-24">
				{#if Object.keys(stats.workTypeCounts).length > 0}
					<div class="grid grid-cols-6 gap-y-4">
						{#each Object.entries(stats.workTypeCounts) as [name, count] (name)}
							<div class="flex items-center gap-2" title={name}>
								<img
									src="/icons/work/{name.toLowerCase().replace(/ /g, '-')}.webp"
									alt={name}
									class="size-10"
								/>
								<div class="text-xl font-bold">{count}</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">None</div>
				{/if}
			</div>
		</section>

		<!-- Mounts -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Mounts
			</h2>
			<div class="h-14">
				{#if Object.keys(stats.mountCounts).length > 0}
					<div class="grid grid-cols-4 gap-x-4 gap-y-3 sm:grid-cols-6">
						{#each Object.entries(stats.mountCounts) as [name, count] (name)}
							<div class="text-center">
								<div class="text-2xl font-bold">{count}</div>
								<div class="text-sm text-muted-foreground">{name}</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">None</div>
				{/if}
			</div>
		</section>

		<!-- Breeding -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Breeding
			</h2>
			<div class="h-14">
				{#if stats.breedingCombos > 0}
					<div class="flex flex-wrap gap-x-8 gap-y-3">
						<div class="text-center">
							<div class="text-4xl font-bold">{stats.breedingCombos}</div>
							<div class="text-sm text-muted-foreground">Combinations</div>
						</div>
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">None</div>
				{/if}
			</div>
		</section>

		<!-- Refresh -->
		<RefreshSection lastRefresh={stats.lastRefresh} onRefreshComplete={fetchStats} />
	</div>
</div>
