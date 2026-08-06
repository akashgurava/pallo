import type { Page } from "playwright";
import { parsePalPage } from "./parser";
import { parseMountsPage } from "./mounts-parser";
import { parseDetailPage } from "./detail-parser";
import { parsePassiveSkillsPage } from "./passives-parser";
import { parseBreedingResults } from "./breeding-parser";

const PALDB_BASE = "https://paldb.cc/en";

/** Fetches and parses the main Pals list page (elements, work suitabilities, raw pals) */
export async function fetchPalsPage(page: Page) {
  await page.goto(`${PALDB_BASE}/Pals`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("div.col[data-filters]", { timeout: 15000 });
  const html = await page.content();
  return parsePalPage(html);
}

/** Fetches and parses the Mounts page */
export async function fetchMountsPage(page: Page) {
  await page.goto(`${PALDB_BASE}/Mounts`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#GroundMounts", { timeout: 15000 });
  const html = await page.content();
  return parseMountsPage(html);
}

/** Fetches and parses a single Pal's detail page (stats, movement, GVAS code, egg type) */
export async function fetchPalDetailPage(page: Page, palName: string) {
  const slug = palName.replace(/ /g, "_");
  const url = `${PALDB_BASE}/${slug}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".card", { timeout: 10000 });
  const html = await page.content();
  return parseDetailPage(html);
}

/** Fetches and parses the Passive Skills page */
export async function fetchPassivesPage(page: Page) {
  await page.goto(`${PALDB_BASE}/Passive_Skills`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("div.col", { timeout: 15000 });
  const html = await page.content();
  return parsePassiveSkillsPage(html);
}

/** Fetches and parses breeding combinations for a given Pal code */
export async function fetchBreedingPage(palCode: string) {
  const url = `${PALDB_BASE}/api/pal_breed_2a?parent2a=${encodeURIComponent(palCode)}&parent2b=&useChild=0&hideSlime=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseBreedingResults(html);
}
