import fs from "fs";
import path from "path";

export interface PalSaveData {
  instanceId: string;
  playerUId: string;
  characterId: string;
  nickname?: string | undefined;
  gender: string;
  level: number;
  exp?: number | undefined;
  hpIv: number;
  attackIv: number;
  shotIv: number;
  defenseIv: number;
  passives: string[];
  isPlayer: boolean;
}

export class GvasReader {
  buffer: Buffer;
  offset: number;

  constructor(buffer: Buffer, offset = 0) {
    this.buffer = buffer;
    this.offset = offset;
  }

  readInt32(): number {
    const val = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readUInt32(): number {
    const val = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readInt64(): bigint {
    const val = this.buffer.readBigInt64LE(this.offset);
    this.offset += 8;
    return val;
  }

  readUInt64(): number {
    const val = this.buffer.readBigUInt64LE(this.offset);
    this.offset += 8;
    return Number(val);
  }

  readUInt16(): number {
    const val = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readUInt8(): number {
    const val = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readFloat(): number {
    const val = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return val;
  }

  readString(): string {
    const len = this.readInt32();
    if (len === 0) return "";
    if (len < 0) {
      const utf16Len = -len * 2;
      const str = this.buffer.toString("utf16le", this.offset, this.offset + utf16Len - 2);
      this.offset += utf16Len;
      return str;
    }
    const str = this.buffer.toString("utf8", this.offset, this.offset + len - 1);
    this.offset += len;
    return str;
  }

  readGuid(): string {
    const b = this.buffer.subarray(this.offset, this.offset + 16);
    this.offset += 16;
    return b.toString("hex");
  }

  readBytes(count: number): Buffer {
    const b = this.buffer.subarray(this.offset, this.offset + count);
    this.offset += count;
    return b;
  }
}

export function parsePalSaveData(gvasBuffer: Buffer): PalSaveData[] {
  const targetPattern = Buffer.from("CharacterSaveParameterMap");
  const mapOffset = gvasBuffer.indexOf(targetPattern);
  if (mapOffset === -1) {
    throw new Error("CharacterSaveParameterMap not found in GVAS buffer");
  }

  const reader = new GvasReader(gvasBuffer, mapOffset);
  reader.readString(); // CharacterSaveParameterMap
  reader.readString(); // MapProperty
  reader.readUInt64(); // propSize
  reader.readString(); // Key StructProperty
  reader.readString(); // Value StructProperty
  reader.readUInt8(); // flag
  reader.readUInt32(); // Padding 0

  const count = reader.readInt32();
  const pals: PalSaveData[] = [];

  for (let i = 0; i < count; i++) {
    let playerUId = "";
    let instanceId = "";

    while (reader.offset < gvasBuffer.length) {
      const keyPropName = reader.readString();
      if (keyPropName === "None" || keyPropName === "") break;
      const keyPropType = reader.readString();
      const keyPropSize = reader.readUInt64();

      if (keyPropName === "PlayerUId") {
        reader.readString();
        reader.readBytes(16);
        reader.readUInt8();
        playerUId = reader.readGuid();
      } else if (keyPropName === "InstanceId") {
        reader.readString();
        reader.readBytes(16);
        reader.readUInt8();
        instanceId = reader.readGuid();
      } else {
        reader.offset += keyPropSize;
        if (keyPropType === "StructProperty") {
          reader.readString();
          reader.readBytes(16);
          reader.readUInt8();
        } else {
          reader.readUInt8();
        }
      }
    }

    let characterId = "";
    let nickname: string | undefined = undefined;
    let gender = "Unknown";
    let level = 1;
    let exp: number | undefined = undefined;
    let hpIv = 0;
    let attackIv = 0;
    let shotIv = 0;
    let defenseIv = 0;
    const passives: string[] = [];
    let isPlayer = false;

    while (reader.offset < gvasBuffer.length) {
      const fieldName = reader.readString();
      if (fieldName === "None" || fieldName === "") break;
      const fieldType = reader.readString();
      const fieldSize = reader.readUInt64();

      if (fieldName === "CharacterID") {
        reader.readUInt8();
        characterId = reader.readString();
      } else if (fieldName === "Gender") {
        reader.readString();
        reader.readUInt8();
        const genderVal = reader.readString();
        gender = genderVal.includes("Female") ? "Female" : "Male";
      } else if (fieldName === "Level") {
        reader.readUInt8();
        level = reader.readInt32();
      } else if (fieldName === "Exp") {
        reader.readUInt8();
        exp = Number(reader.readInt64());
      } else if (fieldName === "IsPlayer") {
        const val = reader.readUInt8();
        reader.readUInt8();
        isPlayer = val !== 0;
      } else if (fieldName === "Talent_HP") {
        reader.readUInt8();
        hpIv = reader.readInt32();
      } else if (fieldName === "Talent_Melee") {
        reader.readUInt8();
        attackIv = reader.readInt32();
      } else if (fieldName === "Talent_Shot") {
        reader.readUInt8();
        shotIv = reader.readInt32();
      } else if (fieldName === "Talent_Defense") {
        reader.readUInt8();
        defenseIv = reader.readInt32();
      } else if (fieldName === "PassiveSkillList") {
        reader.readString();
        reader.readUInt8();
        const passiveCount = reader.readInt32();
        for (let p = 0; p < passiveCount; p++) {
          passives.push(reader.readString());
        }
      } else if (fieldName === "Nickname") {
        reader.readUInt8();
        nickname = reader.readString();
      } else {
        if (fieldType === "StructProperty") {
          reader.readString();
          reader.readBytes(16);
          reader.readUInt8();
        } else if (fieldType === "ArrayProperty") {
          reader.readString();
          reader.readUInt8();
        } else if (fieldType === "EnumProperty" || fieldType === "ByteProperty") {
          reader.readString();
          reader.readUInt8();
        } else if (fieldType === "BoolProperty") {
          reader.readUInt8();
          reader.readUInt8();
        } else {
          reader.readUInt8();
        }
        reader.offset += fieldSize;
      }
    }

    if (characterId && !isPlayer) {
      pals.push({
        instanceId,
        playerUId,
        characterId,
        nickname,
        gender,
        level,
        exp,
        hpIv,
        attackIv,
        shotIv,
        defenseIv,
        passives,
        isPlayer,
      });
    }
  }

  return pals;
}
