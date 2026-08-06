import { parse, type HTMLElement } from "node-html-parser";
import { createLogger } from "../logger";

const log = createLogger("scraper:detail-parser");

export interface PalStats {
  size: string | null;
  rarity: number | null;
  health: number | null;
  food: number | null;
  meleeAttack: number | null;
  attack: number | null;
  defense: number | null;
  workSpeed: number | null;
  support: number | null;
  captureRate: number | null;
  maleProbability: number | null;
  combiRank: number | null;
  price: number | null;
}

export interface PalMovementData {
  slowWalkSpeed: number | null;
  walkSpeed: number | null;
  runSpeed: number | null;
  rideSprintSpeed: number | null;
  transportSpeed: number | null;
  swimSpeed: number | null;
  swimDashSpeed: number | null;
  stamina: number | null;
}

export interface PalDetailData {
  code: string | null;
  egg: string | null;
  stats: PalStats;
  movement: PalMovementData;
}

const STAT_KEY_MAP: Record<string, keyof PalStats> = {
  Size: "size",
  Rarity: "rarity",
  Health: "health",
  Food: "food",
  MeleeAttack: "meleeAttack",
  Attack: "attack",
  Defense: "defense",
  "Work Speed": "workSpeed",
  Support: "support",
  CaptureRateCorrect: "captureRate",
  MaleProbability: "maleProbability",
  CombiRank: "combiRank",
};

const MOVEMENT_KEY_MAP: Record<string, keyof PalMovementData> = {
  SlowWalkSpeed: "slowWalkSpeed",
  WalkSpeed: "walkSpeed",
  RunSpeed: "runSpeed",
  RideSprintSpeed: "rideSprintSpeed",
  TransportSpeed: "transportSpeed",
  SwimSpeed: "swimSpeed",
  SwimDashSpeed: "swimDashSpeed",
  Stamina: "stamina",
};

function findCardByTitle(root: HTMLElement, title: string): HTMLElement | null {
  const cards = root.querySelectorAll(".card");
  log.debug("searching for card", { title, totalCards: cards.length });
  for (const card of cards) {
    const h5 = card.querySelector(".card-title");
    if (h5 && h5.textContent.includes(title)) {
      log.debug("card found", { title });
      return card;
    }
  }
  log.debug("card not found", { title });
  return null;
}

function parseStatRows(card: HTMLElement): Map<string, string> {
  const result = new Map<string, string>();
  const rows = card.querySelectorAll(".d-flex.justify-content-between.border-bottom");
  log.debug("stat rows found", { count: rows.length });
  for (const row of rows) {
    const divs = row.querySelectorAll(":scope > div");
    if (divs.length < 2) continue;
    const key = divs[0]!.textContent.trim();
    const value = divs[divs.length - 1]!.textContent.trim();
    result.set(key, value);
    log.debug("stat row", { key, value });
  }
  return result;
}

function parseNum(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export function parseDetailPage(html: string): PalDetailData {
  log.debug("parsing detail page", { length: html.length });
  const root = parse(html);

  const stats: PalStats = {
    size: null,
    rarity: null,
    health: null,
    food: null,
    meleeAttack: null,
    attack: null,
    defense: null,
    workSpeed: null,
    support: null,
    captureRate: null,
    maleProbability: null,
    combiRank: null,
    price: null,
  };

  let code: string | null = null;
  let egg: string | null = null;

  const statsCard = findCardByTitle(root, "Stats");
  if (statsCard) {
    const rows = parseStatRows(statsCard);
    for (const [rawKey, value] of rows) {
      if (rawKey.includes("Code")) {
        code = value || null;
        log.debug("code extracted", { value });
        continue;
      }
      if (rawKey.includes("Egg")) {
        egg = value || null;
        log.debug("egg extracted", { value });
        continue;
      }
      const key = Object.keys(STAT_KEY_MAP).find((k) => rawKey.includes(k));
      if (key) {
        const field = STAT_KEY_MAP[key]!;
        if (field === "size") {
          stats.size = value;
        } else {
          (stats as unknown as Record<string, unknown>)[field] = parseNum(value);
        }
        log.debug("stat mapped", { rawKey, field, value });
      }
      if (rawKey.includes("Gold Coin")) {
        stats.price = parseNum(value);
        log.debug("price mapped", { rawKey, value });
      }
    }
  } else {
    log.warn("stats card not found in page");
  }

  const movement: PalMovementData = {
    slowWalkSpeed: null,
    walkSpeed: null,
    runSpeed: null,
    rideSprintSpeed: null,
    transportSpeed: null,
    swimSpeed: null,
    swimDashSpeed: null,
    stamina: null,
  };

  const movementCard = findCardByTitle(root, "Movement");
  if (movementCard) {
    const rows = parseStatRows(movementCard);
    for (const [rawKey, value] of rows) {
      const key = Object.keys(MOVEMENT_KEY_MAP).find((k) => rawKey.includes(k));
      if (key) {
        const field = MOVEMENT_KEY_MAP[key]!;
        (movement as unknown as Record<string, unknown>)[field] = parseNum(value);
        log.debug("movement mapped", { rawKey, field, value });
      }
    }
  } else {
    log.warn("movement card not found in page");
  }

  log.debug("detail parse complete", {
    hasStats: statsCard !== null,
    hasMovement: movementCard !== null,
  });

  return { code, egg, stats, movement };
}
