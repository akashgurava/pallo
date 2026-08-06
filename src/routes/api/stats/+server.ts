import { getConnection } from "$lib/server/db/index";
import {
  pals,
  palStats,
  palMounts,
  palElements,
  palWorkSuitabilities,
  mountTypes,
  elements,
  workTypes,
  breedingCombos,
  passiveSkills,
  meta,
} from "$lib/server/db/schema";
import { asc, count, eq, isNotNull } from "drizzle-orm";
import { createLogger } from "$lib/server/logger";
import { json } from "@sveltejs/kit";
import type { Stats } from "$lib/types";
import type { RequestHandler } from "./$types";

const log = createLogger("api:stats");

export const GET: RequestHandler = async () => {
  try {
    const { db } = getConnection();
    const [totalPals] = await db.select({ count: count() }).from(pals).all();

    const allPalRows = await db
      .select({ id: pals.id, name: pals.name })
      .from(pals)
      .orderBy(asc(pals.id))
      .all();
    const statsIds = new Set(
      (await db.select({ palId: palStats.palId }).from(palStats).all()).map((r) => r.palId),
    );
    const failedPalNames = allPalRows.filter((p) => !statsIds.has(p.id)).map((p) => p.name);

    // Element counts: how many pals per element
    const elementRows = await db
      .select({ name: elements.name, count: count() })
      .from(palElements)
      .innerJoin(elements, eq(palElements.elementId, elements.id))
      .groupBy(elements.name)
      .orderBy(asc(elements.sortOrder))
      .all();

    const elementCounts: Record<string, number> = {};
    for (const row of elementRows) {
      elementCounts[row.name] = row.count;
    }

    // Work type counts: how many pals have each work suitability
    const workTypeRows = await db
      .select({ name: workTypes.name, count: count() })
      .from(palWorkSuitabilities)
      .innerJoin(workTypes, eq(palWorkSuitabilities.workTypeId, workTypes.id))
      .groupBy(workTypes.name)
      .orderBy(asc(workTypes.sortOrder))
      .all();

    const workTypeCounts: Record<string, number> = {};
    for (const row of workTypeRows) {
      workTypeCounts[row.name] = row.count;
    }

    // Mount counts: how many pals per mount type
    const mountRows = await db
      .select({ name: mountTypes.name, count: count() })
      .from(palMounts)
      .innerJoin(mountTypes, eq(palMounts.mountTypeId, mountTypes.id))
      .groupBy(mountTypes.name)
      .all();

    const mountCounts: Record<string, number> = {};
    for (const row of mountRows) {
      mountCounts[row.name] = row.count;
    }

    let lastRefresh: string | null = null;
    try {
      const row = await db.select().from(meta).where(eq(meta.key, "last_refresh")).get();
      lastRefresh = row?.value ?? null;
    } catch (err) {
      log.debug("meta table query failed", { error: String(err) });
      lastRefresh = null;
    }

    const total = totalPals?.count ?? 0;

    // Breeding combos count & missing pals calculation
    const combos = await db
      .select({
        p1: breedingCombos.parent1Id,
        p2: breedingCombos.parent2Id,
        child: breedingCombos.childId,
      })
      .from(breedingCombos)
      .all();

    const breedingCombosCount = combos.length;
    const palsInBreeding = new Set<number>();
    for (const c of combos) {
      palsInBreeding.add(c.p1);
      palsInBreeding.add(c.p2);
      palsInBreeding.add(c.child);
    }
    const breedingMissingPalNames = allPalRows
      .filter((p) => !palsInBreeding.has(p.id))
      .map((p) => p.name);
    const breedingMissing = breedingMissingPalNames.length;

    // Passive skills counts
    const [totalPassivesRow] = await db.select({ count: count() }).from(passiveSkills).all();
    const totalPassives = totalPassivesRow?.count ?? 0;

    const [implantPassivesRow] = await db
      .select({ count: count() })
      .from(passiveSkills)
      .where(eq(passiveSkills.isImplant, true))
      .all();
    const implantPassives = implantPassivesRow?.count ?? 0;

    const [worldTreePassivesRow] = await db
      .select({ count: count() })
      .from(passiveSkills)
      .where(eq(passiveSkills.isWorldTree, true))
      .all();
    const worldTreePassives = worldTreePassivesRow?.count ?? 0;

    const [mutationPassivesRow] = await db
      .select({ count: count() })
      .from(passiveSkills)
      .where(eq(passiveSkills.isMutation, true))
      .all();
    const mutationPassives = mutationPassivesRow?.count ?? 0;

    if (total === 0 && !lastRefresh) {
      log.warn("db is empty, needs refresh");
    } else {
      log.info("stats fetched", {
        totalPals: total,
        failed: failedPalNames.length,
        breedingMissing,
      });
    }

    const result: Stats = {
      totalPals: total,
      failedPals: failedPalNames.length,
      failedPalNames,
      elementCounts,
      workTypeCounts,
      mountCounts,
      breedingCombos: breedingCombosCount,
      breedingMissing,
      breedingMissingNames: breedingMissingPalNames,
      totalPassives,
      implantPassives,
      worldTreePassives,
      mutationPassives,
      lastRefresh,
    };

    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.error("db not available", { error: message, stack });

    const result: Stats = {
      totalPals: 0,
      failedPals: 0,
      failedPalNames: [],
      elementCounts: {},
      workTypeCounts: {},
      mountCounts: {},
      breedingCombos: 0,
      breedingMissing: 0,
      totalPassives: 0,
      implantPassives: 0,
      worldTreePassives: 0,
      mutationPassives: 0,
      lastRefresh: null,
    };

    return json(result, { status: 503 });
  }
};
