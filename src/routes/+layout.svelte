<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<div class="flex h-full flex-col">
	<Navbar />
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
