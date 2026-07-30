import { getConnection } from "$lib/server/db/index.js";
import { pals, palStats, breedingCombos } from "$lib/server/db/schema.js";
import { eq, isNotNull } from "drizzle-orm";
import { parseBreedingResults } from "./breeding-parser.js";
import { createLogger } from "../logger.js";
import type { ProgressCallback } from "./run-list.js";
import type { FailCallback } from "./run-details.js";

const log = createLogger("scraper:breeding");

const API_URL = "https://paldb.cc/en/api/pal_breed_2a";

export async function runBreedingScrape(
  onProgress: ProgressCallback,
  onFail: FailCallback,
  pctStart = 59,
  pctEnd = 98,
): Promise<void> {
  log.info("starting breeding scrape");

  const { db } = getConnection();

  // Get all pals with codes from pal_stats
  const allPals = await db
    .select({ id: pals.id, name: pals.name, code: palStats.code })
    .from(pals)
    .innerJoin(palStats, eq(pals.id, palStats.palId))
    .where(isNotNull(palStats.code))
    .all();

  log.info("pals with codes", { count: allPals.length });

  // Build code → id lookup
  const codeToId = new Map<string, number>();
  for (const pal of allPals) {
    if (pal.code) {
      codeToId.set(pal.code, pal.id);
    }
  }

  let totalInserted = 0;

  for (const [i, pal] of allPals.entries()) {
    const url = `${API_URL}?parent2a=${pal.code}&parent2b=&useChild=0&hideSlime=1`;
    log.debug("fetching breeding combos", { name: pal.name, code: pal.code });

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const html = await res.text();
      const entries = parseBreedingResults(html);

      for (const entry of entries) {
        const parent2Id = codeToId.get(entry.parent2Code);
        const childId = codeToId.get(entry.childCode);

        if (!parent2Id || !childId) {
          log.debug("skipping unknown code", {
            parent2Code: entry.parent2Code,
            childCode: entry.childCode,
          });
          continue;
        }

        // Canonicalize: parent1_id <= parent2_id
        const p1 = Math.min(pal.id, parent2Id);
        const p2 = Math.max(pal.id, parent2Id);

        await db
          .insert(breedingCombos)
          .values({ parent1Id: p1, parent2Id: p2, childId })
          .onConflictDoNothing()
          .run();
        totalInserted++;
      }

      log.debug("breeding combos stored", { name: pal.name, entries: entries.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("failed to fetch breeding combos", { name: pal.name, error: message });
      onFail(`${pal.name}: ${message}`);
    }

    const pct = pctStart + Math.round(((i + 1) / allPals.length) * (pctEnd - pctStart));
    onProgress(`Breeding ${i + 1}/${allPals.length} — ${pal.name}`, pct);
  }

  log.info("breeding scrape complete", { total: allPals.length, inserted: totalInserted });
}
