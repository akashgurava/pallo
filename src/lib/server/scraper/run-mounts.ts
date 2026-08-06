import { firefox } from "playwright";
import { getConnection } from "$lib/server/db/index";
import { fetchMountsPage } from "./fetchers";
import { writeMounts } from "$lib/server/db/writers";
import type { ProgressCallback } from "./run-list";

export async function runMountsScrape(
  onProgress: ProgressCallback,
  pctStart = 10,
  pctEnd = 20,
): Promise<void> {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    onProgress("Scraping mounts page...", pctStart);
    const parsed = await fetchMountsPage(page);
    const { db } = getConnection();
    await writeMounts(db, parsed.mounts);
    onProgress(`Mounts complete: ${parsed.mounts.length} parsed`, pctEnd);
  } finally {
    await browser.close();
  }
}
