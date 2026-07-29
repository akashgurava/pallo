<script lang="ts">
	let {
		name,
		size = 'size-6',
		onclick
	}: {
		name: string;
		size?: string;
		onclick?: () => void;
	} = $props();
</script>

<button {onclick} class="shrink-0 cursor-pointer" title={name}>
	<img
		src="/icons/work/{name.toLowerCase().replace(/ /g, '-')}.webp"
		alt={name}
		class={size}
	/>
</button>
