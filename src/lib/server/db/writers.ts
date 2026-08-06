import { eq } from "drizzle-orm";
import {
  pals,
  elements,
  palElements,
  workTypes,
  palWorkSuitabilities,
  mountTypes,
  palMounts,
  palStats,
  palMovement,
  passiveSkills,
  breedingCombos,
} from "./schema";
import type { PalListEntry } from "$lib/types";
import type { parseDetailPage } from "../scraper/detail-parser";
import type { MountEntry } from "../scraper/mounts-parser";
import type { ParsedPassiveSkill } from "../scraper/passives-parser";
import type { BreedingEntry } from "../scraper/breeding-parser";

export type DetailData = ReturnType<typeof parseDetailPage>;

/** Writes scraped Pals list, elements, and work suitabilities into database */
export async function writePalsList(
  db: any,
  parsedList: { pals: PalListEntry[]; elementOrder: string[]; workTypeOrder: string[] },
) {
  const { pals: palList, elementOrder, workTypeOrder } = parsedList;
  const elementMap = new Map<string, number>();
  const workTypeMap = new Map<string, number>();

  for (const [i, name] of elementOrder.entries()) {
    const existing = await db.select().from(elements).where(eq(elements.name, name)).get();
    if (existing) {
      elementMap.set(name, existing.id);
    } else {
      const res = await db
        .insert(elements)
        .values({ name, sortOrder: i })
        .returning({ id: elements.id })
        .get();
      elementMap.set(name, res.id);
    }
  }

  for (const [i, name] of workTypeOrder.entries()) {
    const existing = await db.select().from(workTypes).where(eq(workTypes.name, name)).get();
    if (existing) {
      workTypeMap.set(name, existing.id);
    } else {
      const res = await db
        .insert(workTypes)
        .values({ name, sortOrder: i })
        .returning({ id: workTypes.id })
        .get();
      workTypeMap.set(name, res.id);
    }
  }

  for (const entry of palList) {
    const pal = await db
      .insert(pals)
      .values({ number: entry.number, variant: entry.variant, name: entry.name })
      .returning({ id: pals.id })
      .get();

    for (const elName of entry.elements) {
      const elementId = elementMap.get(elName);
      if (elementId) {
        await db.insert(palElements).values({ palId: pal.id, elementId }).run();
      }
    }

    for (const suit of entry.workSuitabilities) {
      const workTypeId = workTypeMap.get(suit.workType);
      if (workTypeId) {
        await db
          .insert(palWorkSuitabilities)
          .values({ palId: pal.id, workTypeId, level: suit.level })
          .run();
      }
    }
  }
}

/** Writes scraped mount associations into database */
export async function writeMounts(db: any, mounts: MountEntry[]) {
  const mountTypeMap = new Map<string, number>();

  for (const entry of mounts) {
    const pal = await db
      .select({ id: pals.id })
      .from(pals)
      .where(eq(pals.name, entry.palName))
      .get();
    if (!pal) continue;

    let mountTypeId: number;
    const cachedId = mountTypeMap.get(entry.mountType);
    if (cachedId) {
      mountTypeId = cachedId;
    } else {
      const existing = await db
        .select()
        .from(mountTypes)
        .where(eq(mountTypes.name, entry.mountType))
        .get();
      if (existing) {
        mountTypeId = existing.id;
      } else {
        const res = await db
          .insert(mountTypes)
          .values({ name: entry.mountType })
          .returning({ id: mountTypes.id })
          .get();
        mountTypeId = res.id;
      }
      mountTypeMap.set(entry.mountType, mountTypeId);
    }

    await db
      .insert(palMounts)
      .values({ palId: pal.id, mountTypeId, unlockLevel: entry.unlockLevel ?? 0 })
      .run();
  }
}

/** Writes scraped stats and movement data for a Pal into database */
export async function writePalDetail(db: any, palId: number, data: DetailData) {
  await db
    .insert(palStats)
    .values({ palId, code: data.code, egg: data.egg, ...data.stats })
    .onConflictDoNothing()
    .run();

  await db
    .insert(palMovement)
    .values({ palId, ...data.movement })
    .onConflictDoNothing()
    .run();
}

/** Writes scraped passive skills into database */
export async function writePassives(db: any, parsedPassives: ParsedPassiveSkill[]) {
  for (const p of parsedPassives) {
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
  }
}

/** Writes parsed breeding combinations into database */
export async function writeBreedingCombos(
  db: any,
  palId: number,
  entries: BreedingEntry[],
  codeToId: Map<string, number>,
) {
  let inserted = 0;
  for (const entry of entries) {
    const parent2Id = codeToId.get(entry.parent2Code);
    const childId = codeToId.get(entry.childCode);
    if (!parent2Id || !childId) continue;

    const p1 = Math.min(palId, parent2Id);
    const p2 = Math.max(palId, parent2Id);

    await db
      .insert(breedingCombos)
      .values({ parent1Id: p1, parent2Id: p2, childId })
      .onConflictDoNothing()
      .run();
    inserted++;
  }
  return inserted;
}
