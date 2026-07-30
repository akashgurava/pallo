<script lang="ts">
  import type { SortKey, SortDir } from "$lib/sorting.js";

  let {
    key,
    label,
    sortKey,
    sortDir,
    width = "w-8",
    onclick,
  }: {
    key: SortKey;
    label: string;
    sortKey: SortKey;
    sortDir: SortDir;
    width?: string;
    onclick: () => void;
  } = $props();

  let indicator = $derived(sortKey === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "");
</script>

<th
  class="{width} text-muted-foreground cursor-pointer px-1 text-center text-xs font-medium select-none"
  {onclick}
>
  {label}{indicator}
</th>
