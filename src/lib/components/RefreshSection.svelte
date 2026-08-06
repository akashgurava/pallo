<script lang="ts">
  import { Button } from "$lib/components/ui/button/index";
  import { Progress } from "$lib/components/ui/progress/index";
  import { timeAgo } from "$lib/utils/time";

  let {
    lastRefresh,
    onRefreshComplete,
  }: {
    lastRefresh: string | null;
    onRefreshComplete: () => void;
  } = $props();

  let refreshing = $state(false);
  let progress = $state(0);
  let progressMessage = $state("");
  let showProgress = $state(false);

  async function refresh(): Promise<void> {
    if (refreshing) return;
    refreshing = true;
    showProgress = true;
    progress = 0;
    progressMessage = "";

    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const reader = res.body?.getReader();
      if (!reader) {
        console.error("No response stream");
        refreshing = false;
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));
          if (event.progress >= 0) {
            progress = event.progress;
            progressMessage = event.message;
          }
        }
      }

      onRefreshComplete();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      refreshing = false;
    }
  }
</script>

<section class="space-y-4">
  <div class="text-muted-foreground text-sm">
    Last Refreshed: {#if lastRefresh}{timeAgo(lastRefresh)}{:else}Never{/if}
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
        <div class="text-muted-foreground text-sm">{progressMessage}</div>
      </div>
    {/if}
  </div>
</section>
