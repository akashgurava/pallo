import { parse } from "node-html-parser";
import { createLogger } from "../logger";

const log = createLogger("scraper:mounts-parser");

export interface MountEntry {
  palName: string;
  mountType: string;
  unlockLevel: number | null;
}

export interface ParsedMountsPage {
  mounts: MountEntry[];
}

const MOUNT_TABS = [
  { id: "GroundMounts", type: "Ground" },
  { id: "FlyingMounts", type: "Flying" },
  { id: "WaterMounts", type: "Water" },
] as const;

export function parseMountsPage(html: string): ParsedMountsPage {
  log.debug("parsing mounts page HTML", { length: html.length });
  const root = parse(html);
  const entries: MountEntry[] = [];

  for (const tab of MOUNT_TABS) {
    log.debug("looking for mount tab", { id: tab.id, type: tab.type });
    const container = root.querySelector(`#${tab.id}`);
    if (!container) {
      log.warn("mount tab not found", { id: tab.id });
      continue;
    }

    const rows = container.querySelectorAll("tbody tr");
    log.debug("rows found in tab", { tab: tab.type, count: rows.length });

    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 4) {
        log.debug("skipping row with insufficient cells", {
          tab: tab.type,
          cellCount: cells.length,
        });
        continue;
      }

      const nameLink = cells[0]!.querySelector(".itemname");
      if (!nameLink) {
        log.debug("skipping row without itemname link", { tab: tab.type });
        continue;
      }
      const palName = nameLink.textContent.trim();

      const techCell = cells[3];
      const rawLevel = techCell ? techCell.textContent.trim() : "";
      const unlockLevel = rawLevel ? parseInt(rawLevel, 10) || null : null;

      log.debug("mount entry parsed", {
        palName,
        mountType: tab.type,
        unlockLevel,
      });

      entries.push({ palName, mountType: tab.type, unlockLevel });
    }

    log.debug("tab parsing complete", { tab: tab.type, entries: entries.length });
  }

  log.info("mounts page parse complete", { totalEntries: entries.length });
  return { mounts: entries };
}
