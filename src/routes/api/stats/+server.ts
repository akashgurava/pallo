import { getConnection } from "$lib/server/db/index.js";
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
  meta,
} from "$lib/server/db/schema.js";
import { asc, count, eq, isNotNull } from "drizzle-orm";
import { createLogger } from "$lib/server/logger.js";
import { json } from "@sveltejs/kit";
import type { Stats } from "$lib/types.js";
import type { RequestHandler } from "./$types.js";

const log = createLogger("api:stats");

export const GET: RequestHandler = async () => {
  try {
    const { db } = getConnection();
    const [totalPals] = await db.select({ count: count() }).from(pals).all();

    const allPalRows = await db.select({ id: pals.id, name: pals.name }).from(pals).all();
    const statsIds = new Set(
      (await db.select({ palId: palStats.palId }).from(palStats).all()).map((r) => r.palId),
    );
    const failedPalNames = allPalRows.filter((p) => !statsIds.has(p.id)).map((p) => p.name);

    // Element counts: how many pals per element (ordered by source display order)
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

    // Work type counts: how many pals have each work suitability (ordered by source display order)
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

    // Breeding combos count
    const [breedingTotal] = await db.select({ count: count() }).from(breedingCombos).all();
    const breedingCombosCount = breedingTotal?.count ?? 0;

    // Breeding missing: pals without a code (can't be used in breeding lookup)
    const [palsWithCode] = await db
      .select({ count: count() })
      .from(palStats)
      .where(isNotNull(palStats.code))
      .all();
    const breedingMissing = total - (palsWithCode?.count ?? 0);

    if (total === 0 && !lastRefresh) {
      log.warn("db is empty, needs refresh");
    } else {
      log.info("stats fetched", { totalPals: total, failed: failedPalNames.length });
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
      lastRefresh: null,
    };

    return json(result, { status: 503 });
  }
};
