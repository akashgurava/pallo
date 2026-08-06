import { firefox } from "playwright";
import { asc } from "drizzle-orm";
import { getConnection } from "$lib/server/db/index";
import { pals, palStats } from "$lib/server/db/schema";
import { fetchPalDetailPage } from "./fetchers";
import { writePalDetail } from "$lib/server/db/writers";
import type { ProgressCallback } from "./run-list";

export type FailCallback = (message: string) => void;

export async function runDetailScrape(
  onProgress: ProgressCallback,
  onFail: FailCallback,
  pctStart = 20,
  pctEnd = 98,
): Promise<void> {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const { db } = getConnection();
    const allPals = await db
      .select({ id: pals.id, name: pals.name })
      .from(pals)
      .orderBy(asc(pals.id))
      .all();

    for (const [i, pal] of allPals.entries()) {
      try {
        const detailData = await fetchPalDetailPage(page, pal.name);
        await writePalDetail(db, pal.id, detailData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onFail(`${pal.name}: ${msg}`);
      }

      const pct = pctStart + Math.round(((i + 1) / allPals.length) * (pctEnd - pctStart));
      onProgress(`${i + 1}/${allPals.length} — ${pal.name}`, pct);
    }
  } finally {
    await browser.close();
  }
}

export async function runRetryFailed(
  onProgress: ProgressCallback,
  onFail: FailCallback,
): Promise<void> {
  const { db } = getConnection();
  const allPals = await db
    .select({ id: pals.id, name: pals.name })
    .from(pals)
    .orderBy(asc(pals.id))
    .all();
  const statsIds = new Set(
    (await db.select({ palId: palStats.palId }).from(palStats).all()).map((r) => r.palId),
  );
  const failed = allPals.filter((p) => !statsIds.has(p.id));

  if (failed.length === 0) {
    onProgress("No failed pals to retry", 100);
    return;
  }

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const [i, pal] of failed.entries()) {
      try {
        const detailData = await fetchPalDetailPage(page, pal.name);
        await writePalDetail(db, pal.id, detailData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onFail(`${pal.name}: ${msg}`);
      }

      const pct = Math.round(((i + 1) / failed.length) * 100);
      onProgress(`Retry ${i + 1}/${failed.length} — ${pal.name}`, pct);
    }
  } finally {
    await browser.close();
  }
}
