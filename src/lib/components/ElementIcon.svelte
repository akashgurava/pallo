<script lang="ts">
  let {
    name,
    size = "size-7",
    active = false,
    onclick,
  }: {
    name: string;
    size?: string;
    active?: boolean;
    onclick?: () => void;
  } = $props();
</script>

<button
  {onclick}
  class="rounded p-1.5 transition-colors {active
    ? 'bg-primary/30 ring-primary ring-1'
    : 'hover:bg-muted'}"
  title={name}
>
  <img src="/icons/elements/{name.toLowerCase()}.webp" alt={name} class={size} />
</button>
