import { parse } from "node-html-parser";
import { createLogger } from "../logger.js";

const log = createLogger("scraper:breeding-parser");

export interface BreedingEntry {
  parent2Code: string;
  childCode: string;
}

/**
 * Parse the HTML response from paldb.cc/en/api/pal_breed_2a
 * Each entry is a row with 3 pal images: parent1 + parent2 = child
 * Image src contains internal code in format: T_{CODE}_icon_normal.webp
 */
export function parseBreedingResults(html: string): BreedingEntry[] {
  const root = parse(html);
  const entries: BreedingEntry[] = [];

  // Each breeding row is a div.row or similar container with images
  // Images have src like: /img/T_{CODE}_icon_normal.webp
  const images = root.querySelectorAll("img");
  const codePattern = /T_(.+?)_icon_normal/;

  // Results come in groups of 3 images: parent1, parent2, child
  const codes: string[] = [];
  for (const img of images) {
    const src = img.getAttribute("src") ?? "";
    const match = src.match(codePattern);
    if (match) {
      codes.push(match[1]!);
    }
  }

  // Every 3 codes = one breeding entry (parent1, parent2, child)
  for (let i = 0; i + 2 < codes.length; i += 3) {
    const parent2Code = codes[i + 1]!;
    const childCode = codes[i + 2]!;
    entries.push({ parent2Code, childCode });
  }

  log.debug("breeding results parsed", { imageCount: codes.length, entries: entries.length });
  return entries;
}
