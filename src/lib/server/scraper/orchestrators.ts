import { firefox } from "playwright";
import { asc, eq, isNotNull } from "drizzle-orm";
import { getConnection } from "$lib/server/db/index";
import { pals, palStats } from "$lib/server/db/schema";
import { createLogger } from "../logger";
import {
  fetchPalsPage,
  fetchMountsPage,
  fetchPalDetailPage,
  fetchPassivesPage,
  fetchBreedingPage,
} from "./fetchers";
import {
  writePalsList,
  writeMounts,
  writePalDetail,
  writePassives,
  writeBreedingCombos,
} from "$lib/server/db/writers";

const log = createLogger("scraper:orchestrator");

export type ProgressCallback = (message: string, progress: number) => void;
export type FailCallback = (message: string) => void;

/** Orchestrates Pals, Mounts, Details/Stats, and Passives scraping (Everything except breeding) */
export async function runPalsOrchestrator(
  onProgress: ProgressCallback,
  onFail: FailCallback,
): Promise<void> {
  log.info("starting pals orchestrator");
  const { db } = getConnection();

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Pals List (0% -> 10%)
    onProgress("Fetching Pals list...", 2);
    const parsedList = await fetchPalsPage(page);
    await writePalsList(db, parsedList);
    onProgress(`Parsed ${parsedList.pals.length} pals`, 10);

    // 2. Mounts (10% -> 20%)
    onProgress("Fetching Mounts...", 12);
    const parsedMounts = await fetchMountsPage(page);
    await writeMounts(db, parsedMounts.mounts);
    onProgress(`Parsed ${parsedMounts.mounts.length} mounts`, 20);

    // 3. Pal Details / Stats per Pal ordered numerically by Pal ID (#1, #2...) (20% -> 85%)
    const allPals = await db
      .select({ id: pals.id, name: pals.name })
      .from(pals)
      .orderBy(asc(pals.id))
      .all();

    log.info("scraping pal details", { count: allPals.length });
    for (const [i, pal] of allPals.entries()) {
      try {
        const detailData = await fetchPalDetailPage(page, pal.name);
        await writePalDetail(db, pal.id, detailData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error("failed pal detail parse", { name: pal.name, error: msg });
        onFail(`${pal.name}: ${msg}`);
      }

      const pct = 20 + Math.round(((i + 1) / allPals.length) * 65);
      onProgress(`Stats ${i + 1}/${allPals.length} — ${pal.name}`, pct);
    }

    // 4. Passives (85% -> 98%)
    onProgress("Fetching Passive Skills...", 87);
    const parsedPassives = await fetchPassivesPage(page);
    await writePassives(db, parsedPassives);
    onProgress(`Parsed ${parsedPassives.length} passives`, 98);

    log.info("pals orchestrator complete");
  } finally {
    await browser.close();
  }
}

/** Orchestrates Breeding scraping */
export async function runBreedingOrchestrator(
  onProgress: ProgressCallback,
  onFail: FailCallback,
): Promise<void> {
  log.info("starting breeding orchestrator");
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

  log.info("scraping breeding combos for pals", { count: allPals.length });
  for (const [i, pal] of allPals.entries()) {
    if (!pal.code) continue;
    try {
      const entries = await fetchBreedingPage(pal.code);
      await writeBreedingCombos(db, pal.id, entries, codeToId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("failed breeding parse", { name: pal.name, error: msg });
      onFail(`${pal.name}: ${msg}`);
    }

    const pct = Math.round(((i + 1) / allPals.length) * 98);
    onProgress(`Breeding ${i + 1}/${allPals.length} — ${pal.name}`, pct);
  }

  log.info("breeding orchestrator complete");
}
