import { firefox } from "playwright";
import { getConnection } from "$lib/server/db/index";
import { fetchPassivesPage } from "./fetchers";
import { writePassives } from "$lib/server/db/writers";
import type { ProgressCallback } from "./run-list";

export async function runPassivesScrape(
  onProgress: ProgressCallback,
  pctStart = 90,
  pctEnd = 98,
): Promise<void> {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    onProgress("Scraping passive skills...", pctStart);
    const parsed = await fetchPassivesPage(page);
    const { db } = getConnection();
    await writePassives(db, parsed);
    onProgress(`Passive skills complete: ${parsed.length} parsed`, pctEnd);
  } finally {
    await browser.close();
  }
}
