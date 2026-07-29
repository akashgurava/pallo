<script lang="ts">
	let {
		type,
		size = 'size-6',
		onclick
	}: {
		type: string;
		size?: string;
		onclick?: () => void;
	} = $props();
</script>

<button {onclick} class="cursor-pointer" title={type}>
	<img src="/icons/mounts/{type.toLowerCase()}.svg" alt={type} class={size} />
</button>
