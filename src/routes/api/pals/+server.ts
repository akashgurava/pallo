import { getConnection } from "$lib/server/db/index.js";
import {
  pals,
  elements,
  palElements,
  workTypes,
  palWorkSuitabilities,
  mountTypes,
  palMounts,
  palStats,
  palMovement,
} from "$lib/server/db/schema.js";
import { asc, eq } from "drizzle-orm";
import { createLogger } from "$lib/server/logger.js";
import { json } from "@sveltejs/kit";
import type { PalRow } from "$lib/types.js";
import type { RequestHandler } from "./$types.js";

const log = createLogger("api:pals");

export const GET: RequestHandler = async () => {
  try {
    const { db } = getConnection();

    const allPals = await db
      .select({
        id: pals.id,
        number: pals.number,
        variant: pals.variant,
        name: pals.name,
      })
      .from(pals)
      .orderBy(pals.id)
      .all();

    const rows: PalRow[] = [];

    for (const pal of allPals) {
      const palElementRows = await db
        .select({ name: elements.name })
        .from(palElements)
        .innerJoin(elements, eq(palElements.elementId, elements.id))
        .where(eq(palElements.palId, pal.id))
        .orderBy(asc(elements.sortOrder))
        .all();

      const palWorkRows = await db
        .select({ name: workTypes.name, level: palWorkSuitabilities.level })
        .from(palWorkSuitabilities)
        .innerJoin(workTypes, eq(palWorkSuitabilities.workTypeId, workTypes.id))
        .where(eq(palWorkSuitabilities.palId, pal.id))
        .orderBy(asc(workTypes.sortOrder))
        .all();

      const palMountRows = await db
        .select({ name: mountTypes.name, unlockLevel: palMounts.unlockLevel })
        .from(palMounts)
        .innerJoin(mountTypes, eq(palMounts.mountTypeId, mountTypes.id))
        .where(eq(palMounts.palId, pal.id))
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
        .where(eq(palStats.palId, pal.id))
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
        .where(eq(palMovement.palId, pal.id))
        .get();

      rows.push({
        id: pal.id,
        number: pal.number,
        variant: pal.variant,
        name: pal.name,
        elements: palElementRows.map((r) => r.name),
        workSuitabilities: palWorkRows.map((r) => ({ workType: r.name, level: r.level })),
        mounts: palMountRows.map((r) => ({ type: r.name, unlockLevel: r.unlockLevel })),
        stats: statsRow ?? null,
        movement: movementRow ?? null,
      });
    }

    log.info("pals list fetched", { count: rows.length });
    return json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("failed to fetch pals", { error: message });
    return json([], { status: 503 });
  }
};
