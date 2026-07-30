import { getConnection } from "$lib/server/db/index.js";
import { breedingCombos, pals, palElements, elements } from "$lib/server/db/schema.js";
import { asc, eq } from "drizzle-orm";
import { createLogger } from "$lib/server/logger.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

const log = createLogger("api:breeding:parents");

export const GET: RequestHandler = async ({ url }) => {
  const childId = Number(url.searchParams.get("child"));

  if (!childId) {
    return json({ error: "child required" }, { status: 400 });
  }

  try {
    const { db } = getConnection();

    const combos = await db
      .select({
        parent1Id: breedingCombos.parent1Id,
        parent2Id: breedingCombos.parent2Id,
      })
      .from(breedingCombos)
      .where(eq(breedingCombos.childId, childId))
      .all();

    const palCache = new Map<
      number,
      { id: number; number: string; name: string; elements: string[] }
    >();

    async function getPal(id: number) {
      if (palCache.has(id)) return palCache.get(id)!;
      const pal = await db
        .select({ id: pals.id, number: pals.number, name: pals.name })
        .from(pals)
        .where(eq(pals.id, id))
        .get();
      if (!pal) return null;
      const elRows = await db
        .select({ name: elements.name })
        .from(palElements)
        .innerJoin(elements, eq(palElements.elementId, elements.id))
        .where(eq(palElements.palId, id))
        .orderBy(asc(elements.sortOrder))
        .all();
      const result = { ...pal, elements: elRows.map((e) => e.name) };
      palCache.set(id, result);
      return result;
    }

    const results = [];
    for (const combo of combos) {
      const [parent1, parent2] = await Promise.all([
        getPal(combo.parent1Id),
        getPal(combo.parent2Id),
      ]);
      if (parent1 && parent2) {
        results.push({ parent1, parent2 });
      }
    }

    log.debug("breeding parents lookup", { childId, results: results.length });
    return json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("breeding parents lookup failed", { error: message });
    return json({ error: "lookup failed" }, { status: 500 });
  }
};
