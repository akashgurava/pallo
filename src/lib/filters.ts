import type { PalRow } from "$lib/types";

export type FilterLogic = "and" | "or";

export type StatOp = ">=" | "<=";

export interface StatFilter {
  column: string;
  op: StatOp;
  value: number;
}

export interface StatColumnDef {
  key: string;
  label: string;
  values: number[];
}

// Values at percentiles: 10, 20, 30, 40, 50, 60, 70, 80, 90, 95 (rounded, deduplicated)
// Order matches table columns: Rar, Slow, Walk, Run, Sprint, TPot, Swim, Dash, Stam, HP, ATK, DEF, Food, Coin
export const STAT_COLUMNS: StatColumnDef[] = [
  { key: "rarity", label: "Rarity", values: [1, 3, 4, 5, 6, 7, 8, 9, 10] },
  { key: "slow", label: "Slow", values: [30, 50, 60, 70, 80, 100, 120] },
  { key: "walk", label: "Walk", values: [50, 100, 150, 200, 250] },
  { key: "run", label: "Run", values: [300, 400, 500, 550, 600, 700, 850, 1000] },
  { key: "sprint", label: "Sprint", values: [450, 550, 650, 750, 900, 1000, 1050, 1200, 1400] },
  { key: "tpot", label: "TPot", values: [100, 200, 250, 300, 350, 400, 450, 500] },
  { key: "swim", label: "Swim", values: [100, 200, 250, 400, 450, 600, 850, 1100] },
  { key: "dash", label: "Dash", values: [100, 150, 250, 300, 350, 400, 550, 700, 1000, 1400] },
  { key: "stam", label: "Stam", values: [100, 130, 160, 220, 270] },
  { key: "hp", label: "HP", values: [70, 75, 80, 90, 95, 100, 105, 110, 120, 130] },
  { key: "atk", label: "ATK", values: [70, 80, 85, 90, 95, 105, 115, 125, 130] },
  { key: "def", label: "DEF", values: [70, 75, 80, 85, 90, 100, 110, 120, 125] },
  { key: "food", label: "Food", values: [100, 150, 200, 300, 350, 400, 450, 550, 600] },
  {
    key: "price",
    label: "Coin",
    values: [450, 650, 1100, 1450, 1700, 2000, 2350, 2800, 3650, 4300],
  },
];

/** Map of element name → selected */
export type ElementFilter = Set<string>;

/** Map of work type name → minimum level (0 = not filtered) */
export type WorkTypeFilter = Map<string, number>;

export interface MountFilter {
  types: Set<string>;
  maxLevel: number; // 0 = no level filter
}

export interface FilterState {
  nameQuery: string;
  selectedElements: ElementFilter;
  workTypeFilter: WorkTypeFilter;
  mountFilter: MountFilter;
  statFilters: StatFilter[];
  elementLogic: FilterLogic;
  workTypeLogic: FilterLogic;
}

function getStatFromPal(pal: PalRow, key: string): number | null {
  switch (key) {
    case "hp":
      return pal.stats?.health ?? null;
    case "atk":
      return pal.stats?.attack ?? null;
    case "def":
      return pal.stats?.defense ?? null;
    case "food":
      return pal.stats?.food ?? null;
    case "price":
      return pal.stats?.price ?? null;
    case "rarity":
      return pal.stats?.rarity ?? null;
    case "slow":
      return pal.movement?.slowWalkSpeed ?? null;
    case "walk":
      return pal.movement?.walkSpeed ?? null;
    case "run":
      return pal.movement?.runSpeed ?? null;
    case "sprint":
      return pal.movement?.rideSprintSpeed ?? null;
    case "tpot":
      return pal.movement?.transportSpeed ?? null;
    case "swim":
      return pal.movement?.swimSpeed ?? null;
    case "dash":
      return pal.movement?.swimDashSpeed ?? null;
    case "stam":
      return pal.movement?.stamina ?? null;
    default:
      return null;
  }
}

export function filterPals(pals: PalRow[], filters: FilterState): PalRow[] {
  return pals.filter((pal) => {
    // Name filter
    if (filters.nameQuery) {
      if (!pal.name.toLowerCase().includes(filters.nameQuery.toLowerCase())) return false;
    }

    // Element filter
    if (filters.selectedElements.size > 0) {
      if (filters.elementLogic === "or") {
        const hasAny = pal.elements.some((e) => filters.selectedElements.has(e));
        if (!hasAny) return false;
      } else {
        const hasAll = [...filters.selectedElements].every((name) => pal.elements.includes(name));
        if (!hasAll) return false;
      }
    }

    // Work type filter
    const activeWorkFilters = [...filters.workTypeFilter.entries()].filter(([, lvl]) => lvl > 0);
    if (activeWorkFilters.length > 0) {
      if (filters.workTypeLogic === "or") {
        const hasAny = activeWorkFilters.some(([name, minLevel]) =>
          pal.workSuitabilities.some((w) => w.workType === name && w.level >= minLevel),
        );
        if (!hasAny) return false;
      } else {
        const hasAll = activeWorkFilters.every(([name, minLevel]) =>
          pal.workSuitabilities.some((w) => w.workType === name && w.level >= minLevel),
        );
        if (!hasAll) return false;
      }
    }

    // Stat filters
    if (filters.statFilters.length > 0) {
      for (const sf of filters.statFilters) {
        const val = getStatFromPal(pal, sf.column);
        if (val === null) return false;
        if (sf.op === ">=" && val < sf.value) return false;
        if (sf.op === "<=" && val > sf.value) return false;
      }
    }

    // Mount filter
    if (filters.mountFilter.types.size > 0) {
      const hasAll = [...filters.mountFilter.types].every((type) =>
        pal.mounts.some(
          (m) =>
            m.type === type &&
            (filters.mountFilter.maxLevel === 0 || m.unlockLevel <= filters.mountFilter.maxLevel),
        ),
      );
      if (!hasAll) return false;
    } else if (filters.mountFilter.maxLevel > 0) {
      // Level set but no type selected: any mount at that level
      const hasAny = pal.mounts.some((m) => m.unlockLevel <= filters.mountFilter.maxLevel);
      if (!hasAny) return false;
    }

    return true;
  });
}
