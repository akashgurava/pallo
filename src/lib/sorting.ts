import type { PalRow } from '$lib/types.js';
import type { WorkTypeFilter, FilterLogic } from '$lib/filters.js';

export type SortKey =
	| 'id' | 'name' | 'elements' | 'work' | 'mounts'
	| 'size' | 'rarity' | 'hp' | 'atk' | 'def' | 'food' | 'price'
	| 'slow' | 'walk' | 'run' | 'sprint' | 'tpot' | 'swim' | 'dash' | 'stam';

export type SortDir = 'asc' | 'desc';

const SIZE_ORDER: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };

function getNumericStat(pal: PalRow, key: SortKey): number | null {
	switch (key) {
		case 'rarity': return pal.stats?.rarity ?? null;
		case 'hp': return pal.stats?.health ?? null;
		case 'atk': return pal.stats?.attack ?? null;
		case 'def': return pal.stats?.defense ?? null;
		case 'food': return pal.stats?.food ?? null;
		case 'price': return pal.stats?.price ?? null;
		case 'slow': return pal.movement?.slowWalkSpeed ?? null;
		case 'walk': return pal.movement?.walkSpeed ?? null;
		case 'run': return pal.movement?.runSpeed ?? null;
		case 'sprint': return pal.movement?.rideSprintSpeed ?? null;
		case 'tpot': return pal.movement?.transportSpeed ?? null;
		case 'swim': return pal.movement?.swimSpeed ?? null;
		case 'dash': return pal.movement?.swimDashSpeed ?? null;
		case 'stam': return pal.movement?.stamina ?? null;
		default: return null;
	}
}

function workSortValue(
	pal: PalRow,
	workTypeFilter: WorkTypeFilter,
	workTypeLogic: FilterLogic
): number {
	const activeFilters = [...workTypeFilter.entries()].filter(([, lvl]) => lvl > 0);
	if (activeFilters.length === 0) {
		return pal.workSuitabilities.reduce((sum, w) => sum + w.level, 0);
	}
	const selectedNames = activeFilters.map(([name]) => name);
	const matchingLevels = pal.workSuitabilities
		.filter((w) => selectedNames.includes(w.workType))
		.map((w) => w.level);

	if (workTypeLogic === 'and') {
		return matchingLevels.reduce((sum, l) => sum + l, 0);
	} else {
		return matchingLevels.length > 0 ? Math.max(...matchingLevels) : 0;
	}
}

export function sortPals(
	list: PalRow[],
	sortKey: SortKey,
	sortDir: SortDir,
	workTypeFilter: WorkTypeFilter,
	workTypeLogic: FilterLogic
): PalRow[] {
	const sorted = [...list];
	sorted.sort((a, b) => {
		if (sortKey === 'mounts') {
			const aHas = a.mounts.length > 0;
			const bHas = b.mounts.length > 0;
			if (aHas && !bHas) return -1;
			if (!aHas && bHas) return 1;
			if (!aHas && !bHas) return 0;
			const aLevel = Math.min(...a.mounts.map((m) => m.unlockLevel));
			const bLevel = Math.min(...b.mounts.map((m) => m.unlockLevel));
			return sortDir === 'asc' ? aLevel - bLevel : bLevel - aLevel;
		}

		if (sortKey === 'size') {
			const aSize = SIZE_ORDER[a.stats?.size ?? ''] ?? -1;
			const bSize = SIZE_ORDER[b.stats?.size ?? ''] ?? -1;
			if (aSize === -1 && bSize === -1) return 0;
			if (aSize === -1) return 1;
			if (bSize === -1) return -1;
			const cmp = aSize - bSize;
			return sortDir === 'asc' ? cmp : -cmp;
		}

		const aNum = getNumericStat(a, sortKey);
		const bNum = getNumericStat(b, sortKey);
		if (aNum !== null || bNum !== null) {
			if (aNum === null && bNum === null) return 0;
			if (aNum === null) return 1;
			if (bNum === null) return -1;
			const cmp = aNum - bNum;
			return sortDir === 'asc' ? cmp : -cmp;
		}

		let cmp = 0;
		switch (sortKey) {
			case 'id':
				cmp = a.id - b.id;
				break;
			case 'name':
				cmp = a.name.localeCompare(b.name);
				break;
			case 'elements':
				cmp = a.elements.length - b.elements.length;
				break;
			case 'work':
				cmp = workSortValue(a, workTypeFilter, workTypeLogic) - workSortValue(b, workTypeFilter, workTypeLogic);
				break;
		}
		return sortDir === 'asc' ? cmp : -cmp;
	});
	return sorted;
}
