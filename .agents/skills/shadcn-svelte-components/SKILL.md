---
name: shadcn-svelte-components
description: Guidelines and standards for shadcn-svelte and bits-ui primitives, Tailwind styling, component composition, and CLI usage.
---

# shadcn-svelte & bits-ui Guidelines

## Core Principles
- **Primitives**: Rely on `shadcn-svelte` and `bits-ui` primitives for accessible UI controls (Tabs, Dialog, Popover, Select, Tooltip, Command, DropdownMenu).
- **Component Discovery & Docs**: Use `https://shadcn-svelte.com/llms.txt` or `npx shadcn-svelte@latest add <component>` for installing official components.
- **Active State Attributes**: Active state for `bits-ui` components uses `data-[state=active]:...` (e.g., `data-[state=active]:bg-white/10 data-[state=active]:text-white`), NOT `data-active`.
- **Styling Utility**: Always import and use `cn(...)` from `$lib/utils` when extending or combining Tailwind CSS classes dynamically.

## Component Composition Rules
- **Sub-component Export/Import**: Import subcomponents directly or through namespace object export (e.g., `import * as Dialog from "$lib/components/ui/dialog"`).
- **Fixed Widths & Containers**: Do not wrap fixed-width primitives (such as `PalAutocomplete`) inside flexible flex/grid sizing containers (`flex-1`, `max-w-*`). Keep component-owned explicit widths.
- **Dropdown & Popover Overflow**: Never apply `overflow-hidden` to parent containers holding dropdowns, tooltips, or popovers to prevent clipping.

## CLI & Registry
- **Adding Components**: `npx shadcn-svelte@latest add <component_name>`
- **Project Config**: Refers to `components.json` for paths (`$lib/components/ui`), alias mappings, and Tailwind configuration.
