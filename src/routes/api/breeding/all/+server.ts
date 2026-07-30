import { getConnection } from '$lib/server/db/index.js';
import {
	breedingCombos,
	pals,
	palElements,
	elements,
	palWorkSuitabilities,
	workTypes,
	palMounts,
	mountTypes,
	palStats,
	palMovement
} from '$lib/server/db/schema.js';
import { asc, eq, or } from 'drizzle-orm';
import { createLogger } from '$lib/server/logger.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const log = createLogger('api:breeding:all');

export const GET: RequestHandler = async ({ url }) => {
	const parentId = Number(url.searchParams.get('parent'));

	if (!parentId) {
		return json({ error: 'parent required' }, { status: 400 });
	}

	try {
		const { db } = getConnection();

		// Find all combos where this pal is either parent1 or parent2
		const combos = await db
			.select({
				parent1Id: breedingCombos.parent1Id,
				parent2Id: breedingCombos.parent2Id,
				childId: breedingCombos.childId
			})
			.from(breedingCombos)
			.where(
				or(
					eq(breedingCombos.parent1Id, parentId),
					eq(breedingCombos.parent2Id, parentId)
				)
			)
			.all();

		const results = [];

		for (const combo of combos) {
			// The "other parent" is whichever isn't our selected parent
			const otherParentId = combo.parent1Id === parentId ? combo.parent2Id : combo.parent1Id;

			const [otherParent, childPal] = await Promise.all([
				db.select({ id: pals.id, number: pals.number, variant: pals.variant, name: pals.name })
					.from(pals).where(eq(pals.id, otherParentId)).get(),
				db.select({ id: pals.id, number: pals.number, variant: pals.variant, name: pals.name })
					.from(pals).where(eq(pals.id, combo.childId)).get()
			]);

			if (!otherParent || !childPal) continue;

			const [otherElements, otherMounts, childElements, childWork, childMounts, childStats, childMov] =
				await Promise.all([
					db.select({ name: elements.name }).from(palElements)
						.innerJoin(elements, eq(palElements.elementId, elements.id))
						.where(eq(palElements.palId, otherParent.id))
						.orderBy(asc(elements.sortOrder)).all(),
					db.select({ name: mountTypes.name, unlockLevel: palMounts.unlockLevel })
						.from(palMounts)
						.innerJoin(mountTypes, eq(palMounts.mountTypeId, mountTypes.id))
						.where(eq(palMounts.palId, otherParent.id)).all(),
					db.select({ name: elements.name }).from(palElements)
						.innerJoin(elements, eq(palElements.elementId, elements.id))
						.where(eq(palElements.palId, childPal.id))
						.orderBy(asc(elements.sortOrder)).all(),
					db.select({ name: workTypes.name, level: palWorkSuitabilities.level })
						.from(palWorkSuitabilities)
						.innerJoin(workTypes, eq(palWorkSuitabilities.workTypeId, workTypes.id))
						.where(eq(palWorkSuitabilities.palId, childPal.id))
						.orderBy(asc(workTypes.sortOrder)).all(),
					db.select({ name: mountTypes.name, unlockLevel: palMounts.unlockLevel })
						.from(palMounts)
						.innerJoin(mountTypes, eq(palMounts.mountTypeId, mountTypes.id))
						.where(eq(palMounts.palId, childPal.id)).all(),
					db.select({
						size: palStats.size, rarity: palStats.rarity, health: palStats.health,
						attack: palStats.attack, defense: palStats.defense,
						food: palStats.food, price: palStats.price
					}).from(palStats).where(eq(palStats.palId, childPal.id)).get(),
					db.select({
						slowWalkSpeed: palMovement.slowWalkSpeed, walkSpeed: palMovement.walkSpeed,
						runSpeed: palMovement.runSpeed, rideSprintSpeed: palMovement.rideSprintSpeed,
						transportSpeed: palMovement.transportSpeed, swimSpeed: palMovement.swimSpeed,
						swimDashSpeed: palMovement.swimDashSpeed, stamina: palMovement.stamina
					}).from(palMovement).where(eq(palMovement.palId, childPal.id)).get()
				]);

			results.push({
				parent: {
					...otherParent,
					elements: otherElements.map((e) => e.name),
					mounts: otherMounts.map((m) => ({ type: m.name, unlockLevel: m.unlockLevel }))
				},
				child: {
					...childPal,
					elements: childElements.map((e) => e.name),
					workSuitabilities: childWork.map((w) => ({ workType: w.name, level: w.level })),
					mounts: childMounts.map((m) => ({ type: m.name, unlockLevel: m.unlockLevel })),
					stats: childStats ?? null,
					movement: childMov ?? null
				}
			});
		}

		log.debug('breeding all lookup', { parentId, results: results.length });
		return json({ results });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		log.error('breeding all lookup failed', { error: message });
		return json({ error: 'lookup failed' }, { status: 500 });
	}
};
