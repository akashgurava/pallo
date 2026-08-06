import { asc, eq, isNotNull } from "drizzle-orm";
import { getConnection } from "$lib/server/db/index";
import { pals, palStats } from "$lib/server/db/schema";
import { fetchBreedingPage } from "./fetchers";
import { writeBreedingCombos } from "$lib/server/db/writers";
import type { ProgressCallback } from "./run-list";
import type { FailCallback } from "./run-details";

export async function runBreedingScrape(
  onProgress: ProgressCallback,
  onFail: FailCallback,
  pctStart = 59,
  pctEnd = 98,
): Promise<void> {
  const { db } = getConnection();

  const allPals = await db
    .select({ id: pals.id, name: pals.name, code: palStats.code })
    .from(pals)
    .innerJoin(palStats, eq(pals.id, palStats.palId))
    .where(isNotNull(palStats.code))
    .orderBy(asc(pals.id))
    .all();

  const codeToId = new Map<string, number>();
  for (const pal of allPals) {
    if (pal.code) {
      codeToId.set(pal.code, pal.id);
    }
  }

  for (const [i, pal] of allPals.entries()) {
    if (!pal.code) continue;
    try {
      const entries = await fetchBreedingPage(pal.code);
      await writeBreedingCombos(db, pal.id, entries, codeToId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onFail(`${pal.name}: ${msg}`);
    }

    const pct = pctStart + Math.round(((i + 1) / allPals.length) * (pctEnd - pctStart));
    onProgress(`Breeding ${i + 1}/${allPals.length} — ${pal.name}`, pct);
  }
}
