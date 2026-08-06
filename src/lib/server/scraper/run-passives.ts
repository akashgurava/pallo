import { firefox } from "playwright";
import { getConnection } from "$lib/server/db/index.js";
import { passiveSkills } from "$lib/server/db/schema.js";
import { parsePassiveSkillsPage } from "./passives-parser.js";
import { createLogger } from "../logger.js";
import type { ProgressCallback } from "./run-list.js";

const log = createLogger("scraper:passives");
const PASSIVES_URL = "https://paldb.cc/en/Passive_Skills";

export async function runPassivesScrape(
  onProgress: ProgressCallback,
  pctStart = 90,
  pctEnd = 98,
): Promise<void> {
  log.info("starting passive skills scrape", { url: PASSIVES_URL });

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    onProgress("Scraping passive skills...", pctStart);
    await page.goto(PASSIVES_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("div.col", { timeout: 15000 });

    const html = await page.content();
    const parsedPassives = parsePassiveSkillsPage(html);

    onProgress(`Found ${parsedPassives.length} passive skills`, pctStart + 1);

    const { db } = getConnection();

    for (const [i, p] of parsedPassives.entries()) {
      await db
        .insert(passiveSkills)
        .values({
          name: p.name,
          description: p.description,
          rank: p.rank,
          isImplant: p.isImplant,
          isWorldTree: p.isWorldTree,
          isMutation: p.isMutation,
          isPalSurgeryTable: p.isPalSurgeryTable,
          weight: p.weight,
          hp: p.hp,
          attack: p.attack,
          defense: p.defense,
          workSpeed: p.workSpeed,
          movement: p.movement,
          san: p.san,
        })
        .onConflictDoUpdate({
          target: passiveSkills.name,
          set: {
            description: p.description,
            rank: p.rank,
            isImplant: p.isImplant,
            isWorldTree: p.isWorldTree,
            isMutation: p.isMutation,
            isPalSurgeryTable: p.isPalSurgeryTable,
            weight: p.weight,
            hp: p.hp,
            attack: p.attack,
            defense: p.defense,
            workSpeed: p.workSpeed,
            movement: p.movement,
            san: p.san,
          },
        })
        .run();

      const pct = pctStart + Math.round(((i + 1) / parsedPassives.length) * (pctEnd - pctStart));
      if ((i + 1) % 10 === 0 || i + 1 === parsedPassives.length) {
        onProgress(`Inserted ${i + 1}/${parsedPassives.length} passive skills`, pct);
      }
    }

    log.info("passive skills scrape complete", { count: parsedPassives.length });
  } finally {
    await browser.close();
  }
}
