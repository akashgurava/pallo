import { parse } from "node-html-parser";
import { createLogger } from "../logger";
import type { PalListEntry } from "$lib/types";

const log = createLogger("scraper:parser");

export interface ParsedPage {
  pals: PalListEntry[];
  elementOrder: string[];
  workTypeOrder: string[];
}

function parseNumberAndVariant(raw: string): { number: string; variant: string | null } {
  const match = raw.match(/^#(\d+)([A-Z])?$/);
  if (!match) {
    throw new Error(`Failed to parse pal number: "${raw}"`);
  }
  return {
    number: match[1]!,
    variant: match[2] ?? null,
  };
}

function parseFilterOrder(html: string): { elementOrder: string[]; workTypeOrder: string[] } {
  const root = parse(html);

  const elementOrder: string[] = [];
  const workTypeOrder: string[] = [];

  const buttons = root.querySelectorAll("button[data-filter]");
  log.debug("filter buttons found", { count: buttons.length });

  for (const button of buttons) {
    const filter = button.getAttribute("data-filter") ?? "";
    // Skip pal card buttons (have trailing digits)
    if (filter.match(/\d+$/)) continue;

    const img = button.querySelector("img");
    if (!img) continue;
    const alt = img.getAttribute("alt") ?? "";

    if (alt.match(/Ticonpalwork/i) && !workTypeOrder.includes(filter)) {
      workTypeOrder.push(filter);
    }
    if (alt.match(/TIconelement/i) && !elementOrder.includes(filter)) {
      elementOrder.push(filter);
    }
  }

  log.debug("filter order parsed", {
    elements: elementOrder.length,
    workTypes: workTypeOrder.length,
  });

  return { elementOrder, workTypeOrder };
}

function parsePalList(html: string): PalListEntry[] {
  const root = parse(html);
  const palEntries: PalListEntry[] = [];

  const cols = root.querySelectorAll("div.col[data-filters]");
  log.debug("pal cards found in HTML", { count: cols.length });

  for (const col of cols) {
    const numberSpan = col.querySelector("span.text-white-50");
    if (!numberSpan) continue;
    const rawNumber = numberSpan.textContent.trim();
    if (!rawNumber.match(/^#\d+/)) continue;
    const { number, variant } = parseNumberAndVariant(rawNumber);

    const nameLink = col.querySelector("a.itemname");
    if (!nameLink) continue;
    const name = nameLink.textContent.trim();

    // Elements
    const elements: string[] = [];
    const elementImgs = col.querySelectorAll('img[alt^="TIconelement"]');
    for (const img of elementImgs) {
      const title = img.getAttribute("data-bs-title");
      if (title) {
        elements.push(title);
      }
    }

    // Work suitabilities
    const workSuitabilities: PalListEntry["workSuitabilities"] = [];
    const buttons = col.querySelectorAll("button[data-filter]");
    for (const button of buttons) {
      const filter = button.getAttribute("data-filter") ?? "";
      const match = filter.match(/^(.+?)(\d+)$/);
      if (match) {
        workSuitabilities.push({
          workType: match[1]!,
          level: parseInt(match[2]!, 10),
        });
      }
    }

    palEntries.push({ number, variant, name, elements, workSuitabilities });
  }

  log.debug("pal list parsed", { count: palEntries.length });
  return palEntries;
}

export function parsePalPage(html: string): ParsedPage {
  log.debug("parsing pal page HTML", { length: html.length });
  const { elementOrder, workTypeOrder } = parseFilterOrder(html);
  const pals = parsePalList(html);
  log.info("parse complete", {
    pals: pals.length,
    elements: elementOrder.length,
    workTypes: workTypeOrder.length,
  });
  return { pals, elementOrder, workTypeOrder };
}
