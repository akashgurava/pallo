import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execSync } from 'child_process';

export interface ExtractedPal {
  instanceId?: string | undefined;
  characterId: string;
  palName: string;
  number?: string | undefined;
  nickname?: string | undefined;
  gender: string;
  level: number;
  hpIv: number;
  attackIv: number;
  shotIv: number;
  defenseIv: number;
  passives: string[];
}

export const PAL_CHARACTER_ID_MAP: Record<string, { name: string; number: string }> = {
  SheepBall: { name: "Lamball", number: "1" },
  PinkCat: { name: "Cattiva", number: "2" },
  ChickenPal: { name: "Chikipi", number: "3" },
  LittleBriar: { name: "Lifmunk", number: "4" },
  CuteFox: { name: "Vixy", number: "6" },
  FlyingManta: { name: "Celaray", number: "7" },
  WoolFox: { name: "Cremis", number: "8" },
  TeaElephant: { name: "Teafant", number: "11" },
  PlantSlime: { name: "Gumoss", number: "12" },
  Hedgehog: { name: "Jolthog", number: "15" },
  Hedgehog_Ice: { name: "Jolthog Cryst", number: "15B" },
  NegativeOctopus: { name: "Depresso", number: "16" },
  Penguin: { name: "Pengullet", number: "17" },
  KingPenguin: { name: "Penking", number: "18" },
  GhostCat: { name: "Hoocrates", number: "19" },
  Alpaca: { name: "Melpaca", number: "20" },
  KingPaca: { name: "Kingpaca", number: "21" },
  KingPaca_Ice: { name: "Kingpaca Cryst", number: "21B" },
  NightDemon: { name: "Daedream", number: "22" },
  Monkey: { name: "Tanzee", number: "23" },
  BlackCat: { name: "Nox", number: "24" },
  FlameBambi: { name: "Rooby", number: "26" },
  BiteLizard: { name: "Mau", number: "27" },
  BiteLizard_Ice: { name: "Mau Cryst", number: "27B" },
  Boar: { name: "Rushoar", number: "28" },
  Kitsunebi: { name: "Foxparks", number: "29" },
  Squid: { name: "Killamari", number: "30" },
  Mole: { name: "Fuddler", number: "31" },
  Deer: { name: "Eikthyrdeer", number: "32" },
  Deer_Ground: { name: "Eikthyrdeer Terra", number: "32B" },
  Ushi: { name: "Caprity", number: "34" },
  Eagle: { name: "Galeclaw", number: "49" },
  WeaselPal: { name: "Chillet", number: "55" },
  FireKitsune: { name: "Arsox", number: "58" },
  BlueDragon: { name: "Elphidran", number: "63" },
  GrassPanda: { name: "Dinossom", number: "64" },
  GrassPanda_Electric: { name: "Dinossom Lux", number: "64B" },
  LizardMan: { name: "Leezpunk", number: "73" },
  LizardMan_Fire: { name: "Leezpunk Ignis", number: "73B" },
  CatMage: { name: "Katress", number: "75" },
  CatMage_Fire: { name: "Katress Ignis", number: "75B" },
  Suzaku_SheepBall: { name: "Sibelyx", number: "79" },
  Manticore: { name: "Blazehowl", number: "84" },
  Manticore_Dark: { name: "Blazehowl Noct", number: "84B" },
  LazyDragon: { name: "Relaxaurus", number: "85" },
  LazyDragon_Electric: { name: "Relaxaurus Lux", number: "85B" },
  Yeti: { name: "Wumpo", number: "91" },
  Yeti_Grass: { name: "Wumpo Botan", number: "91B" },
  KingBahamut: { name: "Blazamut", number: "96" },
  ElecPanda: { name: "Grizzbolt", number: "103" },
  Demon: { name: "Shadowbeak", number: "107" }
};

export class PalSaveReader {
  /**
   * Decompresses a Palworld .sav file into raw GVAS buffer.
   */
  static decompressSavFile(savPath: string): Buffer {
    const fileBuf = fs.readFileSync(savPath);
    if (fileBuf.length < 12) {
      throw new Error('File too small to be a Palworld save');
    }

    const magic = fileBuf.subarray(8, 11).toString('ascii');

    if (magic === 'PlZ' || magic === 'PlS') {
      // Zlib double compression
      const dataOffset = 12;
      const firstDecompress = zlib.inflateSync(fileBuf.subarray(dataOffset));
      const secondDecompress = zlib.inflateSync(firstDecompress);
      return secondDecompress;
    }

    if (magic === 'PlM') {
      // Modern Oodle compression (PlM). Use cached .gvas or python helper
      const gvasCachePath = savPath.replace(/\.sav$/, '.gvas');
      if (fs.existsSync(gvasCachePath)) {
        const savStat = fs.statSync(savPath);
        const gvasStat = fs.statSync(gvasCachePath);
        if (gvasStat.mtime >= savStat.mtime) {
          return fs.readFileSync(gvasCachePath);
        }
      }

      // Decompress via python oozlib helper
      const cleanSavPath = savPath.replace(/\\/g, '/');
      const cleanGvasPath = gvasCachePath.replace(/\\/g, '/');
      const pyCmd = `from palsav.compressor.oozlib import OozLib; f=open("${cleanSavPath}", "rb"); data=f.read(); f.close(); decomp, _ = OozLib().decompress(data); open("${cleanGvasPath}", "wb").write(decomp)`;

      try {
        execSync(`uv run --no-env-file --with "palsav-flex @ git+https://github.com/deafdudecomputers/PalworldSaveTools.git#subdirectory=src/palsav" python3 -c '${pyCmd}'`, {
          stdio: 'pipe'
        });
      } catch (err: any) {
        throw new Error(`Failed to decompress PlM save file: ${err.message}`);
      }

      return fs.readFileSync(gvasCachePath);
    }

    // Check if buffer starts with GVAS directly
    const gvasIdx = fileBuf.indexOf(Buffer.from('GVAS'));
    if (gvasIdx !== -1) {
      return fileBuf.subarray(gvasIdx);
    }

    throw new Error(`Unsupported magic header: ${magic}`);
  }

  /**
   * Reads raw GVAS buffer and extracts all Pal data records in TypeScript.
   */
  static readPalsFromGvas(gvasBuf: Buffer): ExtractedPal[] {
    const target = Buffer.from('PalIndividualCharacterSaveParameter');
    let pos = 0;
    const pals: ExtractedPal[] = [];

    while ((pos = gvasBuf.indexOf(target, pos)) !== -1) {
      const paramStart = pos + target.length + 1 + 16 + 1; // 54 bytes
      const pal = this.parsePalProperties(gvasBuf, paramStart);
      if (pal.characterId && !pal.isPlayer) {
        const resolved = this.formatPalName(pal.characterId);
        pals.push({
          characterId: pal.characterId,
          palName: resolved.name,
          number: resolved.number,
          nickname: pal.nickname,
          gender: pal.gender,
          level: pal.level,
          hpIv: pal.hpIv,
          attackIv: pal.attackIv,
          shotIv: pal.shotIv,
          defenseIv: pal.defenseIv,
          passives: pal.passives.map(p => this.formatPassiveName(p))
        });
      }
      pos += target.length;
    }

    return pals;
  }

  private static parsePalProperties(buf: Buffer, startOffset: number) {
    let offset = startOffset;
    const pal = {
      characterId: '',
      nickname: undefined as string | undefined,
      gender: 'Male',
      level: 1,
      hpIv: 0,
      attackIv: 0,
      shotIv: 0,
      defenseIv: 0,
      passives: [] as string[],
      isPlayer: false
    };

    const maxLimit = Math.min(buf.length, startOffset + 4000);

    while (offset + 4 < maxLimit) {
      let propName = '';
      try {
        const len = buf.readInt32LE(offset);
        offset += 4;
        if (len <= 0 || len > 256) break;
        propName = buf.toString('utf8', offset, offset + len - 1);
        offset += len;
      } catch (e) { break; }

      if (propName === 'None' || !propName) break;

      let propType = '';
      let propSize = 0;
      try {
        const typeLen = buf.readInt32LE(offset);
        offset += 4;
        if (typeLen <= 0 || typeLen > 256) break;
        propType = buf.toString('utf8', offset, offset + typeLen - 1);
        offset += typeLen;

        propSize = Number(buf.readBigUInt64LE(offset));
        offset += 8;
      } catch (e) { break; }

      let arrayType = null;

      if (propType === 'StructProperty') {
        const sLen = buf.readInt32LE(offset); offset += 4 + sLen;
        offset += 16 + 1; // GUID + flag
      } else if (propType === 'ArrayProperty') {
        const aLen = buf.readInt32LE(offset); offset += 4;
        arrayType = buf.toString('utf8', offset, offset + aLen - 1); offset += aLen;
        offset += 1;
      } else if (propType === 'EnumProperty' || propType === 'ByteProperty') {
        const eLen = buf.readInt32LE(offset); offset += 4 + eLen + 1;
      } else if (propType === 'BoolProperty') {
        offset += 2;
      } else {
        offset += 1;
      }

      const payloadStart = offset;
      const payloadEnd = payloadStart + propSize;

      if (propName === 'CharacterID') {
        const sLen = buf.readInt32LE(offset); offset += 4;
        pal.characterId = buf.toString('utf8', offset, offset + sLen - 1);
      } else if (propName === 'Nickname') {
        const sLen = buf.readInt32LE(offset); offset += 4;
        pal.nickname = buf.toString('utf8', offset, offset + sLen - 1);
      } else if (propName === 'Gender') {
        const sLen = buf.readInt32LE(offset); offset += 4;
        const g = buf.toString('utf8', offset, offset + sLen - 1);
        pal.gender = g.includes('Female') ? 'Female' : 'Male';
      } else if (propName === 'Level') {
        if (propSize === 1) pal.level = buf.readUInt8(offset);
        else if (propSize === 4) pal.level = buf.readInt32LE(offset);
      } else if (propName === 'IsPlayer') {
        pal.isPlayer = true;
      } else if (propName === 'Talent_HP') {
        if (propSize === 1) pal.hpIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.hpIv = buf.readInt32LE(offset);
      } else if (propName === 'Talent_Melee') {
        if (propSize === 1) pal.attackIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.attackIv = buf.readInt32LE(offset);
      } else if (propName === 'Talent_Shot') {
        if (propSize === 1) pal.shotIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.shotIv = buf.readInt32LE(offset);
      } else if (propName === 'Talent_Defense') {
        if (propSize === 1) pal.defenseIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.defenseIv = buf.readInt32LE(offset);
      } else if (propName === 'PassiveSkillList' && arrayType === 'NameProperty') {
        const count = buf.readInt32LE(offset); offset += 4;
        const skills: string[] = [];
        for (let s = 0; s < count; s++) {
          const sLen = buf.readInt32LE(offset); offset += 4;
          skills.push(buf.toString('utf8', offset, offset + sLen - 1));
          offset += sLen;
        }
        pal.passives = skills;
      }

      offset = payloadEnd;
    }

    return pal;
  }

  /** Formats internal character ID to clean display name and number */
  static formatPalName(characterId: string): { name: string; number: string } {
    let raw = characterId.replace(/^BOSS_/, '');
    raw = raw.replace(/_Gold$/, '');
    const found = PAL_CHARACTER_ID_MAP[raw];
    if (found) {
      return found;
    }
    return { name: raw, number: '' };
  }

  /** Formats raw passive skill names into human readable names */
  static formatPassiveName(passive: string): string {
    const passiveMap: Record<string, string> = {
      Noukin: 'Musclehead',
      PAL_Sanity_Down_3: 'Workaholic',
      PAL_ALLAttack_up2: 'Ferocious',
      PAL_conceited: 'Conceited',
      PAL_FullStomach_Up_1: 'Glutton',
      TrainerWorkSpeed_UP_1: 'Logging Foreman',
      WorkSuitabilityAddRank_MonsterFarm_1: 'Philanthropist',
      ElementBoost_Thunder_1_PAL: 'Capacitor',
      ElementBoost_Fire_2_PAL: 'Pyromaniac',
      ElementBoost_Normal_1_PAL: 'Zen Mind',
      ElementResist_Dragon_1_PAL: 'Dragonkiller',
      ElementResist_Aqua_1_PAL: 'Waterproof',
      Stamina_Up_1: 'Fit'
    };

    return passiveMap[passive] || passive;
  }
}
