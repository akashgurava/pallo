<script lang="ts">
  import type { FilterLogic } from "$lib/filters.js";

  let {
    value,
    onchange,
  }: {
    value: FilterLogic;
    onchange: (logic: FilterLogic) => void;
  } = $props();
</script>

<div class="border-border flex rounded border text-xs">
  <button
    onclick={() => onchange("or")}
    class="px-2 py-0.5 transition-colors {value === 'or'
      ? 'bg-muted text-foreground'
      : 'text-muted-foreground'}"
  >
    OR
  </button>
  <button
    onclick={() => onchange("and")}
    class="px-2 py-0.5 transition-colors {value === 'and'
      ? 'bg-muted text-foreground'
      : 'text-muted-foreground'}"
  >
    AND
  </button>
</div>
