import fs from "fs";
import path from "path";
import zlib from "zlib";
import { execSync } from "child_process";

export interface ExtractedPal {
  id?: number | undefined;
  palId?: number | undefined;
  instanceId?: string | undefined;
  characterId?: string | undefined;
  palName: string;
  elements?: string[] | undefined;
  number?: string | undefined;
  nickname?: string | undefined;
  gender: string;
  level: number;
  hpIv: number;
  attackIv: number;
  shotIv?: number | undefined;
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
  Demon: { name: "Shadowbeak", number: "107" },
};

export const PASSIVE_SKILL_ID_MAP: Record<string, string> = {
  // Rank 5 & Rank 4 (Diamond)
  WorldTree_CraftSpeed: "Demon's Hand",
  WorldTree_MoveSpeed: "Dimensional Leap",
  WorldTree_ATK_DEF: "God of Destruction",
  WorldTree_Sanity: "Hermit Sage",
  WorldTree_DEF: "Sanctified Meat Shield",
  WorldTree_ATK: "Twin-Edged Holy Blade",
  WorldTree_FullStomach: "World Tree Seedbed",
  MutationPal_Babysitter: "Babysitter",
  PAL_ALLAttack_up3: "Demon God",
  Deffence_up3: "Diamond Body",
  Stamina_Up_3: "Eternal Engine",
  EternalFlame: "Eternal Flame",
  PAL_Sanity_Down_3: "Heart of the Immovable King",
  MutationPal_ExplosionResist: "Heavily Armored",
  MutationPal_Mutant: "Idiosyncratic",
  MutationPal_Immortal: "Immortality",
  Invader: "Invader",
  SwimSpeed_up_3: "King of the Waves",
  KingOfWaves: "King of the Waves",
  King_Of_Waves: "King of the Waves",
  SelfDeathAddItemDrop_up_3: "Lavish Hospitality",
  Legend: "Legend",
  RideJumpCount_Increase1: "Lightfooted",
  Rare: "Lucky",
  Nushi: "Lunker",
  ElementBoost_Aqua_Ice: "Lunker",
  ElementBoost_Aqua_Ice_PAL: "Lunker",
  PAL_FullStomach_Down_3: "Mastery of Fasting",
  WorkSuitabilityAddRank_MonsterFarm_2: "Ranch Master",
  CraftSpeed_up3: "Remarkable Craftsmanship",
  Salvation: "Savior",
  Witch: "Siren of the Void",
  RideJumpCount_Increase2: "Skymarcher",
  MoveSpeed_up_3: "Swift",
  Vampire: "Vampiric",

  // Rank 3 & Rank 2 (Gold)
  SwimSpeed_up_2: "Ace Swimmer",
  CraftSpeed_up2: "Artisan",
  Deffence_up2: "Burly Body",
  ElementBoost_Normal_2_PAL: "Celestial Emperor",
  PAL_FullStomach_Down_2: "Diet Lover",
  ElementBoost_Dragon_2_PAL: "Divine Dragon",
  ElementBoost_Earth_2_PAL: "Earth Emperor",
  WorkSuitabilityAddRank_MonsterFarm_1: "Farmhand",
  PAL_ALLAttack_up2: "Ferocious",
  ElementBoost_Fire_2_PAL: "Flame Emperor",
  AutoHPRegeneRate_Passive: "Healing Coach",
  ElementBoost_Ice_2_PAL: "Ice Emperor",
  Stamina_Up_1: "Infinite Stamina",
  TrainerLogging_up1: "Logging Foreman",
  ElementBoost_Thunder_2_PAL: "Lord of Lightning",
  ElementBoost_Aqua_2_PAL: "Lord of the Sea",
  ElementBoost_Dark_2_PAL: "Lord of the Underworld",
  TrainerMining_up1: "Mine Foreman",
  TrainerWorkSpeed_UP_1: "Motivational Leader",
  SalePrice_Up_1: "Noble",
  Test_PalEgg_HatchingSpeed_Up: "Philanthropist",
  ReloadSpeedUp_Passive: "Reload Master",
  MoveSpeed_up_2: "Runner",
  CoolTimeReduction_Up_1: "Serenity",
  SelfDeathAddItemDrop_up_2: "Service-Minded",
  ElementBoost_Leaf_2_PAL: "Spirit Emperor",
  TrainerDEF_UP_1: "Stronghold Strategist",
  TrainerATK_UP_1: "Vanguard",
  PlayerSP_DecreaseRate_Passive: "Wellness Watcher",
  MiniNushi: "Whopper",
  PAL_Sanity_Down_2: "Workaholic",
  Deffence_up2_2: "Heavyweight",
  Noukin: "Musclehead",

  // Rank 1 (White/Neutral)
  ElementResist_Normal_1_PAL: "Abnormal",
  PAL_oraora: "Aggressive",
  ElementBoost_Dragon_1_PAL: "Blood of the Dragon",
  ElementResist_Leaf_1_PAL: "Botanical Barrier",
  PAL_ALLAttack_up1: "Brave",
  ElementBoost_Thunder_1_PAL: "Capacitor",
  ElementResist_Dark_1_PAL: "Cheery",
  ElementBoost_Ice_1_PAL: "Coldblooded",
  PAL_conceited: "Conceited",
  PAL_FullStomach_Down_1: "Dainty Eater",
  ElementResist_Dragon_1_PAL: "Dragonkiller",
  ElementResist_Earth_1_PAL: "Earthquake Resistant",
  SalePrice_Up_2: "Fine Furs",
  Stamina_Up_2: "Fit as a Fiddle",
  Fit: "Fit as a Fiddle",
  ElementBoost_Leaf_1_PAL: "Fragrant Foliage",
  Deffence_up1: "Hard Skin",
  ElementResist_Ice_1_PAL: "Heated Body",
  PAL_rude: "Hooligan",
  ElementBoost_Aqua_1_PAL: "Hydromaniac",
  CoolTimeReduction_Up_2: "Impatient",
  Nocturnal: "Insomnia",
  ElementResist_Thunder_1_PAL: "Insulated Body",
  PAL_masochist: "Masochist",
  MoveSpeed_up_1: "Nimble",
  Alien: "Otherworldly Cells",
  PAL_Sanity_Down_1: "Positive Thinker",
  ElementBoost_Earth_1_PAL: "Power of Gaia",
  ElementBoost_Fire_1_PAL: "Pyromaniac",
  PAL_sadist: "Sadist",
  CraftSpeed_up1: "Serious",
  SwimSpeed_up_1: "Sleek Stroke",
  ElementBoost_Normal_1_PAL: "Spirit of Zen",
  "Zen Mind": "Spirit of Zen",
  ElementResist_Fire_1_PAL: "Suntan Lover",
  ElementBoost_Dark_1_PAL: "Veil of Darkness",
  ElementResist_Aqua_1_PAL: "Waterproof",
  PAL_CorporateSlave: "Work Slave",

  // Negative Ranks (-1, -2, -3)
  CraftSpeed_down1: "Clumsy",
  PAL_ALLAttack_down1: "Coward",
  Deffence_down1: "Downtrodden",
  CoolTimeReduction_Down_1: "Easygoing",
  PAL_FullStomach_Up_1: "Glutton",
  NonKilling: "Mercy Hit",
  NightOwl: "Night Owl",
  SalePrice_Down_1: "Shabby",
  Stamina_Down_1: "Sickly",
  PAL_Sanity_Up_1: "Unstable",
  PAL_FullStomach_Up_2: "Bottomless Stomach",
  PAL_Sanity_Up_2: "Destructive",
  Deffence_down2: "Brittle",
  PAL_ALLAttack_down2: "Pacifist",
  CraftSpeed_down2: "Slacker",
};

export class PalSaveReader {
  /**
   * Decompresses a Palworld .sav file into raw GVAS buffer.
   */
  static decompressSavFile(savPath: string): Buffer {
    const fileBuf = fs.readFileSync(savPath);
    if (fileBuf.length < 12) {
      throw new Error("File too small to be a Palworld save");
    }

    const magic = fileBuf.subarray(8, 11).toString("ascii");

    if (magic === "PlZ" || magic === "PlS") {
      // Zlib double compression
      const dataOffset = 12;
      const firstDecompress = zlib.inflateSync(fileBuf.subarray(dataOffset));
      const secondDecompress = zlib.inflateSync(firstDecompress);
      return secondDecompress;
    }

    // Ensure ./data directory exists for timestamped files
    const dataDir = path.resolve("data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const timestampedGvasPath = path.join(dataDir, `Level_${timestamp}.gvas`);

    if (magic === "PlM") {
      // Modern Oodle compression (PlM). Use cached .gvas or python helper
      const gvasCachePath = savPath.replace(/\.sav$/, ".gvas");
      if (fs.existsSync(gvasCachePath)) {
        const savStat = fs.statSync(savPath);
        const gvasStat = fs.statSync(gvasCachePath);
        if (gvasStat.mtime >= savStat.mtime) {
          const buf = fs.readFileSync(gvasCachePath);
          try {
            fs.writeFileSync(timestampedGvasPath, buf);
          } catch (err) {
            console.warn("Failed to save timestamped GVAS:", err);
          }
          return buf;
        }
      }

      // Decompress via python oozlib helper script
      const cleanSavPath = savPath.replace(/\\/g, "/");
      const cleanGvasPath = gvasCachePath.replace(/\\/g, "/");

      try {
        execSync(`uv run python3 scripts/decompress_sav.py "${cleanSavPath}" "${cleanGvasPath}"`, {
          stdio: "pipe",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to decompress PlM save file: ${message}`, { cause: err });
      }

      const decompBuf = fs.readFileSync(gvasCachePath);
      try {
        fs.writeFileSync(timestampedGvasPath, decompBuf);
      } catch (err) {
        console.warn("Failed to save decompressed GVAS:", err);
      }
      return decompBuf;
    }

    // Check if buffer starts with GVAS directly
    const gvasIdx = fileBuf.indexOf(Buffer.from("GVAS"));
    if (gvasIdx !== -1) {
      const decompBuf = fileBuf.subarray(gvasIdx);
      try {
        fs.writeFileSync(timestampedGvasPath, decompBuf);
      } catch (err) {
        console.warn("Failed to save GVAS subarray:", err);
      }
      return decompBuf;
    }

    throw new Error(`Unsupported magic header: ${magic}`);
  }

  /**
   * Reads raw GVAS buffer and extracts all Pal data records in TypeScript.
   */
  static readPalsFromGvas(gvasBuf: Buffer): ExtractedPal[] {
    const target = Buffer.from("PalIndividualCharacterSaveParameter");
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
          passives: pal.passives.map((p) => this.formatPassiveName(p)),
        });
      }
      pos += target.length;
    }

    return pals;
  }

  private static parsePalProperties(buf: Buffer, startOffset: number) {
    let offset = startOffset;
    const pal = {
      characterId: "",
      nickname: undefined as string | undefined,
      gender: "Male",
      level: 1,
      hpIv: 0,
      attackIv: 0,
      shotIv: 0,
      defenseIv: 0,
      passives: [] as string[],
      isPlayer: false,
    };

    const maxLimit = Math.min(buf.length, startOffset + 4000);

    while (offset + 4 < maxLimit) {
      let propName: string;
      try {
        const len = buf.readInt32LE(offset);
        offset += 4;
        if (len <= 0 || len > 256) break;
        propName = buf.toString("utf8", offset, offset + len - 1);
        offset += len;
      } catch {
        break;
      }

      if (propName === "None" || !propName) break;

      let propType: string;
      let propSize: number;
      try {
        const typeLen = buf.readInt32LE(offset);
        offset += 4;
        if (typeLen <= 0 || typeLen > 256) break;
        propType = buf.toString("utf8", offset, offset + typeLen - 1);
        offset += typeLen;

        propSize = Number(buf.readBigUInt64LE(offset));
        offset += 8;
      } catch {
        break;
      }

      let arrayType = null;

      if (propType === "StructProperty") {
        const sLen = buf.readInt32LE(offset);
        offset += 4 + sLen;
        offset += 16 + 1; // GUID + flag
      } else if (propType === "ArrayProperty") {
        const aLen = buf.readInt32LE(offset);
        offset += 4;
        arrayType = buf.toString("utf8", offset, offset + aLen - 1);
        offset += aLen;
        offset += 1;
      } else if (propType === "EnumProperty" || propType === "ByteProperty") {
        const eLen = buf.readInt32LE(offset);
        offset += 4 + eLen + 1;
      } else if (propType === "BoolProperty") {
        offset += 2;
      } else {
        offset += 1;
      }

      const payloadStart = offset;
      const payloadEnd = payloadStart + propSize;

      if (propName === "CharacterID") {
        const sLen = buf.readInt32LE(offset);
        offset += 4;
        pal.characterId = buf.toString("utf8", offset, offset + sLen - 1);
      } else if (propName === "Nickname") {
        const sLen = buf.readInt32LE(offset);
        offset += 4;
        pal.nickname = buf.toString("utf8", offset, offset + sLen - 1);
      } else if (propName === "Gender") {
        const sLen = buf.readInt32LE(offset);
        offset += 4;
        const g = buf.toString("utf8", offset, offset + sLen - 1);
        pal.gender = g.includes("Female") ? "Female" : "Male";
      } else if (propName === "Level") {
        if (propSize === 1) pal.level = buf.readUInt8(offset);
        else if (propSize === 4) pal.level = buf.readInt32LE(offset);
      } else if (propName === "IsPlayer") {
        pal.isPlayer = true;
      } else if (propName === "Talent_HP") {
        if (propSize === 1) pal.hpIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.hpIv = buf.readInt32LE(offset);
      } else if (propName === "Talent_Melee") {
        if (propSize === 1) pal.attackIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.attackIv = buf.readInt32LE(offset);
      } else if (propName === "Talent_Shot") {
        if (propSize === 1) pal.shotIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.shotIv = buf.readInt32LE(offset);
      } else if (propName === "Talent_Defense") {
        if (propSize === 1) pal.defenseIv = buf.readUInt8(offset);
        else if (propSize === 4) pal.defenseIv = buf.readInt32LE(offset);
      } else if (propName === "PassiveSkillList" && arrayType === "NameProperty") {
        const count = buf.readInt32LE(offset);
        offset += 4;
        const skills: string[] = [];
        for (let s = 0; s < count; s++) {
          const sLen = buf.readInt32LE(offset);
          offset += 4;
          skills.push(buf.toString("utf8", offset, offset + sLen - 1));
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
    let raw = characterId.replace(/^BOSS_/, "");
    raw = raw.replace(/_Gold$/, "");
    const found = PAL_CHARACTER_ID_MAP[raw];
    if (found) {
      return found;
    }
    return { name: raw, number: "" };
  }

  /** Formats raw passive skill names into human readable names matching raw_passive_skills DB table */
  static formatPassiveName(passive: string): string {
    return PASSIVE_SKILL_ID_MAP[passive] || passive;
  }
}
