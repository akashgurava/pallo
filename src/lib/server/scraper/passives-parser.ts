import { parse } from "node-html-parser";
import { createLogger } from "../logger";

const log = createLogger("scraper:passives-parser");

export interface ParsedPassiveSkill {
  name: string;
  description: string;
  rank: number;
  isImplant: boolean;
  isWorldTree: boolean;
  isMutation: boolean;
  isPalSurgeryTable: boolean;
  weight: number;
  hp: number;
  attack: number;
  defense: number;
  workSpeed: number;
  movement: number;
  san: number;
}

export function parsePassiveSkillsPage(html: string): ParsedPassiveSkill[] {
  const root = parse(html);
  const passivesMap = new Map<string, ParsedPassiveSkill>();

  // Scope specifically to the #PalPassiveSkills container (the 114 Pal Passive Skills)
  const palTab = root.querySelector("#PalPassiveSkills");
  const banners = (palTab || root).querySelectorAll('div[class*="passive_banner_rank"]');
  log.debug("parsing Pal passive skill cards", { count: banners.length });

  for (const banner of banners) {
    const nameEl = banner.querySelector('div[class*="passive-rank"]');
    if (!nameEl) continue;

    const name = nameEl.textContent.trim();
    if (!name) continue;

    // Rank extraction: passive-rank5 -> 5, passive-rank-1 -> -1
    let rank = 0;
    const nameClass = nameEl.getAttribute("class") || "";
    const rankMatch = nameClass.match(/passive-rank(-?\d+)/);
    if (rankMatch) {
      rank = parseInt(rankMatch[1]!, 10);
    }

    // Find parent container box
    let container: Element | null = banner.parentNode as Element | null;
    while (container && container.classList && !container.classList.contains("border")) {
      container = container.parentNode as Element | null;
    }
    if (!container) continue;

    const descEl = container.querySelector("div.p-2");
    const description = descEl ? descEl.textContent.trim().replace(/\s+/g, " ") : "";

    const imgEl = container.querySelector("img.passive_img_rank");
    const tooltip = imgEl ? imgEl.getAttribute("data-bs-title") || "" : "";
    const containerHtml = container.outerHTML || "";
    const containerText = container.textContent ? container.textContent.replace(/\s+/g, " ") : "";

    const combinedText = `${tooltip} | ${description} | ${containerText}`;

    // Badges / Flags
    const isImplant =
      containerHtml.includes("Disposable_Implant") ||
      containerHtml.includes("PalPassiveSkillChange_Consumable") ||
      combinedText.toLowerCase().includes("implant");

    const isWorldTree =
      containerHtml.includes("World_Tree") ||
      containerHtml.includes("fa-tree") ||
      combinedText.toLowerCase().includes("world tree");

    const isMutation =
      containerHtml.includes("Mutation") ||
      containerHtml.includes("T_icon_enemy_Mutant") ||
      combinedText.toLowerCase().includes("mutation");

    const isPalSurgeryTable =
      containerHtml.includes("OperatingTable") ||
      containerHtml.includes("Pal_Surgery_Table") ||
      containerHtml.includes("T_icon_buildObject_OperatingTable");

    // Weight
    let weight = 0;
    const weightMatch = combinedText.match(/Weight\s+(\d+)/i);
    if (weightMatch) {
      weight = parseInt(weightMatch[1]!, 10);
    }

    // Stat extraction helper
    function extractStat(patterns: string[]): number {
      for (const pattern of patterns) {
        // e.g. "Work Speed +10%", "Attack -20%", "Movement Speed increases 20%"
        const r1 = new RegExp(`${pattern}[^%+]*?([+-]?\\d+(?:\\.\\d+)?)%`, "i");
        const m1 = combinedText.match(r1);
        if (m1) return Math.round(parseFloat(m1[1]!));

        // e.g. "20% increase to movement speed"
        const r2 = new RegExp(`([+-]?\\d+(?:\\.\\d+)?)%\\s*[^%+]*?${pattern}`, "i");
        const m2 = combinedText.match(r2);
        if (m2) return Math.round(parseFloat(m2[1]!));
      }
      return 0;
    }

    const hp = extractStat(["Max Health", "MaxHP", "PalHP", "Health", "HP"]);
    const attack = extractStat(["Pal_Attack", "PalAttack", "MeleeAttack", "ShotAttack", "Attack"]);
    const defense = extractStat(["Pal_Defense", "Defense"]);
    const workSpeed = extractStat(["Work Speed", "WorkSpeed", "CraftSpeed"]);
    const movement = extractStat([
      "MoveSpeed",
      "MovementSpeed",
      "Move Speed",
      "SwimSpeed",
      "movement speed",
    ]);

    // SAN:
    // 1. Tooltip: Sanity_Decrease -10% => +10 (SAN drops 10% slower)
    // 2. Desc: SAN drops +10.0% faster => -10; SAN drops +10.0% slower => +10; SAN depletion rate -50.0% => +50
    let san = 0;
    const sanTooltipMatch = combinedText.match(/Sanity_Decrease[^%+]*?([+-]?\d+(?:\.\d+)?)%/i);
    if (sanTooltipMatch) {
      san = Math.round(-parseFloat(sanTooltipMatch[1]!));
    } else {
      const sanDescMatch = combinedText.match(/SAN[^%+]*?([+-]?\d+(?:\.\d+)?)%\s*(faster|slower)/i);
      if (sanDescMatch) {
        const val = parseFloat(sanDescMatch[1]!);
        const dir = sanDescMatch[2]!.toLowerCase();
        san = dir === "slower" ? Math.round(val) : Math.round(-val);
      } else {
        const sanDepletionMatch = combinedText.match(
          /SAN\s+depletion\s+rate\s+([+-]?\d+(?:\.\d+)?)%/i,
        );
        if (sanDepletionMatch) {
          san = Math.round(-parseFloat(sanDepletionMatch[1]!));
        }
      }
    }

    if (!passivesMap.has(name)) {
      passivesMap.set(name, {
        name,
        description,
        rank,
        isImplant,
        isWorldTree,
        isMutation,
        isPalSurgeryTable,
        weight,
        hp,
        attack,
        defense,
        workSpeed,
        movement,
        san,
      });
    }
  }

  const passives = Array.from(passivesMap.values());
  log.info("parsed Pal passive skills", { count: passives.length });
  return passives;
}
