<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import type { Stats } from '$lib/types.js';

	let stats = $state<Stats>({
		totalPals: 0,
		failedPals: 0,
		failedPalNames: [],
		elementCounts: {},
		workTypeCounts: {},
		mountCounts: {},
		lastRefresh: null
	});

	let refreshing = $state(false);
	let progress = $state(0);
	let progressMessage = $state('');
	let showProgress = $state(false);

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

	async function refresh(): Promise<void> {
		if (refreshing) return;
		refreshing = true;
		showProgress = true;
		progress = 0;
		progressMessage = '';

		try {
			const res = await fetch('/api/refresh', { method: 'POST' });
			const reader = res.body?.getReader();
			if (!reader) {
				console.error('No response stream');
				refreshing = false;
				return;
			}

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const event = JSON.parse(line.slice(6));
					if (event.progress >= 0) {
						progress = event.progress;
						progressMessage = event.message;
					}
				}
			}

			await fetchStats();
		} catch (err) {
			console.error('Refresh failed:', err);
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		fetchStats();
	});

	function timeAgo(dateStr: string): string {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const seconds = Math.floor((now - then) / 1000);

		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hr ago`;
		const days = Math.floor(hours / 24);
		if (days === 1) return '1 day ago';
		return `${days} days ago`;
	}
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

		<!-- Last Refresh + Button -->
		<section class="space-y-4">
			<div class="text-sm text-muted-foreground">
				Last Refreshed: {#if stats.lastRefresh}{timeAgo(stats.lastRefresh)}{:else}Never{/if}
			</div>
			<div>
				<Button
					onclick={refresh}
					disabled={refreshing}
					class="bg-white text-black hover:bg-white/90"
					size="sm"
				>
					Refresh DB
				</Button>
				{#if showProgress}
					<div class="mt-3 space-y-1">
						<Progress value={progress} max={100} class="h-2" />
						<div class="text-sm text-muted-foreground">{progressMessage}</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
