---
name: svelte-5-runes
description: Enforces Svelte 5 Runes mode standards ($state, $derived, $derived.by, $props, $effect, $bindable) and integrates @sveltejs/mcp tool suite.
---

# Svelte 5 & Official AI Tools Guidelines

## Core Runes Syntax

- **State**: Use `$state()` for reactive local variables instead of standard `let`.
- **Derived Values**: Use `$derived()` for computed state derived from reactive values. Use `$derived.by(() => { ... })` for complex multi-statement derivations.
- **Props**: Use `$props()` to declare component props (`let { propA, propB } = $props()`).
- **Two-Way Binding**: Use `$bindable()` explicitly for two-way bound props between parent and child components (`let { value = $bindable() } = $props()`).
- **Side Effects**: Use `$effect()` only for side effects (syncing DOM, state persistence, fetching async data based on state). Do NOT use `$effect` to mutate local derived state.

## Official Svelte AI Tooling (@sveltejs/mcp)

When needing official Svelte 5 / SvelteKit documentation, section references, or code verification, use the `@sveltejs/mcp` CLI:

- **List Sections**: `npx -y @sveltejs/mcp list-sections`
- **Get Docs**: `npx -y @sveltejs/mcp get-documentation <sections>`
- **Autofix Code**: `npx -y @sveltejs/mcp svelte-autofixer --path <filepath>`
