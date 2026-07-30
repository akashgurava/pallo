<script lang="ts">
  import { page } from "$app/state";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
</script>

<nav class="border-b border-neutral-800 bg-neutral-950">
  <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
    <a href="/" class="text-foreground text-3xl font-bold tracking-tight">Pallo</a>

    <NavigationMenu.Root>
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="/" class="text-base" data-active={page.url.pathname === "/"}>
            Home
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link
            href="/pals"
            class="text-base"
            data-active={page.url.pathname.startsWith("/pals")}
          >
            Pals
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link
            href="/breeding"
            class="text-base"
            data-active={page.url.pathname.startsWith("/breeding")}
          >
            Breeding
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  </div>
</nav>
