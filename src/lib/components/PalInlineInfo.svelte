<script lang="ts">
	import type { MountInfo } from '$lib/types.js';

	let { pal }: { pal: { number: string; name: string; elements: string[]; mounts: MountInfo[] } } =
		$props();
</script>

<span class="w-10 shrink-0 text-sm text-muted-foreground">#{pal.number}</span>
<span class="shrink-0 text-base">{pal.name}</span>
{#each pal.elements as el (el)}
	<img src="/icons/elements/{el.toLowerCase()}.webp" alt={el} class="size-6 shrink-0" />
{/each}
{#if pal.mounts.length > 0}
	<span class="ml-auto flex shrink-0 items-center gap-2">
		{#each pal.mounts as mount (mount.type)}
			<span class="flex items-center gap-0.5">
				<img
					src="/icons/mounts/{mount.type.toLowerCase()}.svg"
					alt={mount.type}
					class="size-5"
					title="{mount.type}"
				/>
				<span class="text-sm text-muted-foreground">{mount.unlockLevel}</span>
			</span>
		{/each}
	</span>
{/if}
