import { firefox } from "playwright";
import { getConnection } from "$lib/server/db/index";
import { fetchPalsPage } from "./fetchers";
import { writePalsList } from "$lib/server/db/writers";

export type ProgressCallback = (message: string, progress: number) => void;

export async function runListScrape(
  onProgress: ProgressCallback,
  pctStart = 2,
  pctEnd = 10,
): Promise<void> {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    onProgress("Scraping pal list...", pctStart);
    const parsed = await fetchPalsPage(page);
    const { db } = getConnection();
    await writePalsList(db, parsed);
    onProgress(`Inserted ${parsed.pals.length} pals`, pctEnd);
  } finally {
    await browser.close();
  }
}
