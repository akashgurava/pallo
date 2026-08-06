import { getConnection } from "$lib/server/db/index";
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
  palMovement,
} from "$lib/server/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { createLogger } from "$lib/server/logger";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const log = createLogger("api:breeding");

export const GET: RequestHandler = async ({ url }) => {
  const parent1Id = Number(url.searchParams.get("parent1"));
  const parent2Id = Number(url.searchParams.get("parent2"));

  if (!parent1Id || !parent2Id) {
    return json({ error: "parent1 and parent2 required" }, { status: 400 });
  }

  try {
    const { db } = getConnection();

    // Canonicalize: parent1 <= parent2
    const p1 = Math.min(parent1Id, parent2Id);
    const p2 = Math.max(parent1Id, parent2Id);

    const combo = await db
      .select({ childId: breedingCombos.childId })
      .from(breedingCombos)
      .where(and(eq(breedingCombos.parent1Id, p1), eq(breedingCombos.parent2Id, p2)))
      .get();

    if (!combo) {
      return json({ child: null });
    }

    const child = await db
      .select({ id: pals.id, number: pals.number, variant: pals.variant, name: pals.name })
      .from(pals)
      .where(eq(pals.id, combo.childId))
      .get();

    if (!child) {
      return json({ child: null });
    }

    const childElements = await db
      .select({ name: elements.name })
      .from(palElements)
      .innerJoin(elements, eq(palElements.elementId, elements.id))
      .where(eq(palElements.palId, child.id))
      .orderBy(asc(elements.sortOrder))
      .all();

    const childWork = await db
      .select({ name: workTypes.name, level: palWorkSuitabilities.level })
      .from(palWorkSuitabilities)
      .innerJoin(workTypes, eq(palWorkSuitabilities.workTypeId, workTypes.id))
      .where(eq(palWorkSuitabilities.palId, child.id))
      .orderBy(asc(workTypes.sortOrder))
      .all();

    const childMounts = await db
      .select({ name: mountTypes.name, unlockLevel: palMounts.unlockLevel })
      .from(palMounts)
      .innerJoin(mountTypes, eq(palMounts.mountTypeId, mountTypes.id))
      .where(eq(palMounts.palId, child.id))
      .all();

    const statsRow = await db
      .select({
        size: palStats.size,
        rarity: palStats.rarity,
        health: palStats.health,
        attack: palStats.attack,
        defense: palStats.defense,
        food: palStats.food,
        price: palStats.price,
      })
      .from(palStats)
      .where(eq(palStats.palId, child.id))
      .get();

    const movementRow = await db
      .select({
        slowWalkSpeed: palMovement.slowWalkSpeed,
        walkSpeed: palMovement.walkSpeed,
        runSpeed: palMovement.runSpeed,
        rideSprintSpeed: palMovement.rideSprintSpeed,
        transportSpeed: palMovement.transportSpeed,
        swimSpeed: palMovement.swimSpeed,
        swimDashSpeed: palMovement.swimDashSpeed,
        stamina: palMovement.stamina,
      })
      .from(palMovement)
      .where(eq(palMovement.palId, child.id))
      .get();

    log.debug("breeding lookup", { p1, p2, child: child.name });

    return json({
      child: {
        ...child,
        elements: childElements.map((e) => e.name),
        workSuitabilities: childWork.map((w) => ({ workType: w.name, level: w.level })),
        mounts: childMounts.map((m) => ({ type: m.name, unlockLevel: m.unlockLevel })),
        stats: statsRow ?? null,
        movement: movementRow ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("breeding lookup failed", { error: message });
    return json({ error: "lookup failed" }, { status: 500 });
  }
};
