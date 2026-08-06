import { json } from '@sveltejs/kit';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PalSaveReader, PAL_CHARACTER_ID_MAP, type ExtractedPal } from '$lib/server/save_reader/save_reader';
import { getConnection } from '$lib/server/db/index.js';
import { passiveSkills, pals as palsTable, palStats as palStatsTable, userPals } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

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
 * Saves extracted Level.sav pals into `user_pals` table with palId referencing `raw_pals.id`
 */
async function savePalsToDb(extracted: ExtractedPal[]): Promise<void> {
  const { db } = getConnection();

  const dbPals = await db.select().from(palsTable);
  const dbStats = await db.select().from(palStatsTable);

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

  function resolvePalId(characterId: string, palName: string): number {
    const raw = characterId.replace(/^BOSS_/, '').replace(/_Gold$/, '');

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

  // Clear previous user pals table records
  await db.delete(userPals).run();

  // Insert extracted pals into user_pals
  for (const p of extracted) {
    const resolvedPalId = resolvePalId(p.characterId, p.palName);
    await db
      .insert(userPals)
      .values({
        palId: resolvedPalId,
        characterId: p.characterId,
        nickname: p.nickname || null,
        gender: p.gender,
        level: p.level,
        hpIv: p.hpIv,
        attackIv: p.attackIv,
        shotIv: p.shotIv,
        defenseIv: p.defenseIv,
        passives: JSON.stringify(p.passives),
      })
      .run();
  }
}

/**
 * Fetches user pals from SQLite by INNER JOINing user_pals with raw_pals
 */
async function fetchUserPalsFromDb() {
  const { db } = getConnection();

  const records = await db
    .select({
      id: userPals.id,
      palId: userPals.palId,
      characterId: userPals.characterId,
      nickname: userPals.nickname,
      gender: userPals.gender,
      level: userPals.level,
      hpIv: userPals.hpIv,
      attackIv: userPals.attackIv,
      shotIv: userPals.shotIv,
      defenseIv: userPals.defenseIv,
      passivesRaw: userPals.passives,
      number: palsTable.number,
      variant: palsTable.variant,
      palName: palsTable.name,
    })
    .from(userPals)
    .innerJoin(palsTable, eq(userPals.palId, palsTable.id));

  return records.map((r) => {
    let passives: string[] = [];
    try {
      passives = JSON.parse(r.passivesRaw);
    } catch (e) {}

    return {
      id: r.id,
      palId: r.palId,
      characterId: r.characterId,
      palName: r.palName,
      number: r.number,
      variant: r.variant,
      nickname: r.nickname,
      gender: r.gender,
      level: r.level,
      hpIv: r.hpIv,
      attackIv: r.attackIv,
      shotIv: r.shotIv,
      defenseIv: r.defenseIv,
      passives: passives,
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
      const saveDir = path.resolve('SaveGames');
      if (fs.existsSync(saveDir)) {
        function findLevelSav(dir: string): string | null {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              const res = findLevelSav(fullPath);
              if (res) return res;
            } else if (file === 'Level.sav') {
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
      passivesMap: passivesMap
    });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to read save data', pals: [], passivesMap: {} }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const passivesMap = await getPassivesMap();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return json({ error: 'No Level.sav file uploaded', pals: [], passivesMap }, { status: 400 });
    }

    // Write uploaded file to temp file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pallo-upload-'));
    const tmpSavPath = path.join(tmpDir, file.name || 'Level.sav');
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(tmpSavPath, Buffer.from(arrayBuffer));

    // Process uploaded file
    const gvasBuf = PalSaveReader.decompressSavFile(tmpSavPath);
    const extracted = PalSaveReader.readPalsFromGvas(gvasBuf);

    // Save to DB with foreign key palId referencing pals.id
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
      passivesMap: passivesMap
    });
  } catch (err: any) {
    return json({ error: err.message || 'Failed to parse uploaded Level.sav file', pals: [], passivesMap: {} }, { status: 500 });
  }
};
