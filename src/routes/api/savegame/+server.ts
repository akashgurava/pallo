import { json } from "@sveltejs/kit";
import path from "path";
import fs from "fs";
import os from "os";
import {
  PalSaveReader,
  PAL_CHARACTER_ID_MAP,
  PASSIVE_SKILL_ID_MAP,
  type ExtractedPal,
} from "$lib/server/save_reader/save_reader";
import { getConnection } from "$lib/server/db/index";
import {
  passiveSkills,
  pals as palsTable,
  palStats as palStatsTable,
  userPals,
  userPalPassives,
  elements as elementsTable,
  palElements as palElementsTable,
} from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

async function getPassivesMap() {
  try {
    const { db } = getConnection();
    const list = await db.select().from(passiveSkills);
    return Object.fromEntries(list.map((p) => [p.name, p]));
  } catch (e) {
    return {};
  }
}

/**
 * Saves extracted Level.sav pals into `user_pals` and `user_pal_passives` tables
 */
async function savePalsToDb(extracted: ExtractedPal[]): Promise<void> {
  const { db } = getConnection();

  const dbPals = await db.select().from(palsTable);
  const dbStats = await db.select().from(palStatsTable);
  const dbPassives = await db.select().from(passiveSkills);

  const statsMap = new Map<string, number>();
  for (const s of dbStats) {
    if (s.code) {
      statsMap.set(s.code.toLowerCase(), s.palId);
    }
  }

  const nameMap = new Map<string, number>();
  for (const p of dbPals) {
    nameMap.set(p.name.toLowerCase(), p.id);
  }

  const passiveMap = new Map<string, number>();
  for (const ps of dbPassives) {
    passiveMap.set(ps.name.toLowerCase(), ps.id);
  }

  function resolvePalId(characterId: string, palName: string): number {
    const raw = characterId.replace(/^BOSS_/, "").replace(/_Gold$/, "");

    // 1. Check palStats code (e.g. Boar -> Rushoar pal.id)
    if (statsMap.has(raw.toLowerCase())) {
      return statsMap.get(raw.toLowerCase())!;
    }

    // 2. Check PAL_CHARACTER_ID_MAP
    const mapped = PAL_CHARACTER_ID_MAP[raw];
    if (mapped && nameMap.has(mapped.name.toLowerCase())) {
      return nameMap.get(mapped.name.toLowerCase())!;
    }

    // 3. Check direct name match
    if (nameMap.has(palName.toLowerCase())) {
      return nameMap.get(palName.toLowerCase())!;
    }
    if (nameMap.has(raw.toLowerCase())) {
      return nameMap.get(raw.toLowerCase())!;
    }

    // Fallback default to first pal
    return dbPals[0]?.id || 1;
  }

  // Clear previous records in user_pal_passives and user_pals
  await db.delete(userPalPassives).run();
  await db.delete(userPals).run();

  // Insert extracted pals into user_pals and user_pal_passives
  for (const p of extracted) {
    const resolvedPalId = resolvePalId(p.characterId || "", p.palName);
    const [inserted] = await db
      .insert(userPals)
      .values({
        palId: resolvedPalId,
        nickname: p.nickname || null,
        gender: p.gender,
        level: p.level,
        hpIv: p.hpIv,
        attackIv: p.shotIv || p.attackIv,
        defenseIv: p.defenseIv,
      })
      .returning({ id: userPals.id });

    if (inserted?.id && p.passives && p.passives.length > 0) {
      for (let slot = 0; slot < p.passives.length; slot++) {
        const rawSkill = p.passives[slot];
        if (!rawSkill) continue;
        const mappedName = PASSIVE_SKILL_ID_MAP[rawSkill] || rawSkill;
        const skillId = passiveMap.get(mappedName.toLowerCase());
        if (skillId) {
          try {
            await db
              .insert(userPalPassives)
              .values({
                userPalId: inserted.id,
                passiveSkillId: skillId,
                slot: slot,
              })
              .run();
          } catch (e) {}
        }
      }
    }
  }
}

/**
 * Fetches user pals from SQLite by JOINing user_pals, raw_pals, user_pal_passives, and raw_passive_skills
 */
async function fetchUserPalsFromDb() {
  const { db } = getConnection();

  const userPalsList = await db
    .select({
      id: userPals.id,
      palId: userPals.palId,
      nickname: userPals.nickname,
      gender: userPals.gender,
      level: userPals.level,
      hpIv: userPals.hpIv,
      attackIv: userPals.attackIv,
      defenseIv: userPals.defenseIv,
      number: palsTable.number,
      variant: palsTable.variant,
      palName: palsTable.name,
    })
    .from(userPals)
    .innerJoin(palsTable, eq(userPals.palId, palsTable.id));

  // Fetch elements for pals
  const palElementRows = await db
    .select({
      palId: palElementsTable.palId,
      elementName: elementsTable.name,
    })
    .from(palElementsTable)
    .innerJoin(elementsTable, eq(palElementsTable.elementId, elementsTable.id))
    .orderBy(elementsTable.sortOrder);

  const elementsByPalId = new Map<number, string[]>();
  for (const r of palElementRows) {
    if (!elementsByPalId.has(r.palId)) {
      elementsByPalId.set(r.palId, []);
    }
    elementsByPalId.get(r.palId)!.push(r.elementName);
  }

  const passivesList = await db
    .select({
      userPalId: userPalPassives.userPalId,
      passiveName: passiveSkills.name,
      slot: userPalPassives.slot,
    })
    .from(userPalPassives)
    .innerJoin(passiveSkills, eq(userPalPassives.passiveSkillId, passiveSkills.id));

  const passivesByPalId = new Map<number, string[]>();
  for (const p of passivesList) {
    if (!passivesByPalId.has(p.userPalId)) {
      passivesByPalId.set(p.userPalId, []);
    }
    passivesByPalId.get(p.userPalId)!.push(p.passiveName);
  }

  return userPalsList.map((r) => {
    return {
      id: r.id,
      palId: r.palId,
      palName: r.palName,
      elements: elementsByPalId.get(r.palId) || [],
      number: r.number,
      variant: r.variant,
      nickname: r.nickname,
      gender: r.gender,
      level: r.level,
      hpIv: r.hpIv,
      attackIv: r.attackIv,
      defenseIv: r.defenseIv,
      passives: passivesByPalId.get(r.id) || [],
    };
  });
}

export const GET: RequestHandler = async () => {
  try {
    const passivesMap = await getPassivesMap();

    // Check if we already have saved user pals in database
    let pals = await fetchUserPalsFromDb();

    if (pals.length === 0) {
      // Auto-load Level.sav if present in ./SaveGames
      const saveDir = path.resolve("SaveGames");
      if (fs.existsSync(saveDir)) {
        function findLevelSav(dir: string): string | null {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              const res = findLevelSav(fullPath);
              if (res) return res;
            } else if (file === "Level.sav") {
              return fullPath;
            }
          }
          return null;
        }

        const savPath = findLevelSav(saveDir);
        if (savPath) {
          const gvasBuf = PalSaveReader.decompressSavFile(savPath);
          const extracted = PalSaveReader.readPalsFromGvas(gvasBuf);
          await savePalsToDb(extracted);
          pals = await fetchUserPalsFromDb();
        }
      }
    }

    return json({
      success: true,
      totalPals: pals.length,
      pals: pals,
      passivesMap: passivesMap,
    });
  } catch (err: any) {
    return json(
      { error: err.message || "Failed to read save data", pals: [], passivesMap: {} },
      { status: 500 },
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const passivesMap = await getPassivesMap();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return json({ error: "No Level.sav file uploaded", pals: [], passivesMap }, { status: 400 });
    }

    // Write uploaded file to temp file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pallo-upload-"));
    const tmpSavPath = path.join(tmpDir, file.name || "Level.sav");
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tmpSavPath, fileBuffer);

    // Also save timestamped copy to ./data/
    const dataDir = path.resolve("data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const timestampedSavPath = path.join(dataDir, `Level_${timestamp}.sav`);
    try {
      fs.writeFileSync(timestampedSavPath, fileBuffer);
    } catch (e) {}

    // Process uploaded file
    const gvasBuf = PalSaveReader.decompressSavFile(tmpSavPath);
    const extracted = PalSaveReader.readPalsFromGvas(gvasBuf);

    // Save to DB with foreign key palId referencing pals.id and passiveSkillId referencing passiveSkills.id
    await savePalsToDb(extracted);
    const pals = await fetchUserPalsFromDb();

    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}

    return json({
      success: true,
      filename: file.name,
      totalPals: pals.length,
      pals: pals,
      passivesMap: passivesMap,
    });
  } catch (err: any) {
    return json(
      {
        error: err.message || "Failed to parse uploaded Level.sav file",
        pals: [],
        passivesMap: {},
      },
      { status: 500 },
    );
  }
};
