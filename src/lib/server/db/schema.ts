import { integer, real, sqliteTable, text, primaryKey, index } from "drizzle-orm/sqlite-core";

/** App metadata (last refresh timestamp, etc.) */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Element types (Fire, Water, etc.) with display order from paldb. */
export const elements = sqliteTable("raw_elements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Work suitability types (Kindling, Watering, etc.) with display order from paldb. */
export const workTypes = sqliteTable("raw_work_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Passive skills scraped from paldb. */
export const passiveSkills = sqliteTable("raw_passive_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  rank: integer("rank").notNull().default(0),
  isImplant: integer("is_implant", { mode: "boolean" }).notNull().default(false),
  isWorldTree: integer("is_world_tree", { mode: "boolean" }).notNull().default(false),
  isMutation: integer("is_mutation", { mode: "boolean" }).notNull().default(false),
  isPalSurgeryTable: integer("is_pal_surgery_table", { mode: "boolean" }).notNull().default(false),
  weight: integer("weight").notNull().default(0),
  hp: integer("hp").notNull().default(0),
  attack: integer("attack").notNull().default(0),
  defense: integer("defense").notNull().default(0),
  workSpeed: integer("work_speed").notNull().default(0),
  movement: integer("movement").notNull().default(0),
  san: integer("san").notNull().default(0),
});

/** Mount categories: Ground, Flying, Water. */
export const mountTypes = sqliteTable("raw_mount_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

/** Core pal identity scraped from the paldb list page. */
export const pals = sqliteTable("raw_pals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull(),
  variant: text("variant"),
  name: text("name").notNull().unique(),
});

/** Pal-to-element associations from the paldb list page. */
export const palElements = sqliteTable(
  "raw_pal_elements",
  {
    palId: integer("pal_id")
      .notNull()
      .references(() => pals.id, { onDelete: "cascade" }),
    elementId: integer("element_id")
      .notNull()
      .references(() => elements.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.palId, table.elementId] })],
);

/** Pal work suitability levels from the paldb list page. */
export const palWorkSuitabilities = sqliteTable(
  "raw_pal_work_suitabilities",
  {
    palId: integer("pal_id")
      .notNull()
      .references(() => pals.id, { onDelete: "cascade" }),
    workTypeId: integer("work_type_id")
      .notNull()
      .references(() => workTypes.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
  },
  (table) => [primaryKey({ columns: [table.palId, table.workTypeId] })],
);

/** Stats card data from each pal's detail page on paldb. Field order matches source. */
export const palStats = sqliteTable("raw_pal_stats", {
  palId: integer("pal_id")
    .primaryKey()
    .references(() => pals.id, { onDelete: "cascade" }),
  size: text("size"),
  rarity: integer("rarity"),
  health: integer("health"),
  food: integer("food"),
  meleeAttack: integer("melee_attack"),
  attack: integer("attack"),
  defense: integer("defense"),
  workSpeed: integer("work_speed"),
  support: integer("support"),
  captureRate: real("capture_rate"),
  maleProbability: integer("male_probability"),
  combiRank: integer("combi_rank"),
  price: integer("price"),
  egg: text("egg"),
  code: text("code").unique(),
});

/** Movement card data from each pal's detail page on paldb. */
export const palMovement = sqliteTable("raw_pal_movement", {
  palId: integer("pal_id")
    .primaryKey()
    .references(() => pals.id, { onDelete: "cascade" }),
  slowWalkSpeed: integer("slow_walk_speed"),
  walkSpeed: integer("walk_speed"),
  runSpeed: integer("run_speed"),
  rideSprintSpeed: integer("ride_sprint_speed"),
  transportSpeed: integer("transport_speed"),
  swimSpeed: integer("swim_speed"),
  swimDashSpeed: integer("swim_dash_speed"),
  stamina: integer("stamina"),
});

/** Mount unlock data from the paldb mounts page. */
export const palMounts = sqliteTable(
  "raw_pal_mounts",
  {
    palId: integer("pal_id")
      .notNull()
      .references(() => pals.id, { onDelete: "cascade" }),
    mountTypeId: integer("mount_type_id")
      .notNull()
      .references(() => mountTypes.id, { onDelete: "cascade" }),
    unlockLevel: integer("unlock_level").notNull(),
  },
  (table) => [primaryKey({ columns: [table.palId, table.mountTypeId] })],
);

/** Breeding combinations from paldb. parent1_id <= parent2_id (commutative). */
export const breedingCombos = sqliteTable(
  "raw_breeding_combos",
  {
    parent1Id: integer("parent1_id")
      .notNull()
      .references(() => pals.id, { onDelete: "cascade" }),
    parent2Id: integer("parent2_id")
      .notNull()
      .references(() => pals.id, { onDelete: "cascade" }),
    childId: integer("child_id")
      .notNull()
      .references(() => pals.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.parent1Id, table.parent2Id] }),
    index("raw_breeding_combos_child_id_idx").on(table.childId),
  ],
);

/** Extracted pals saved from user's Level.sav file. */
export const userPals = sqliteTable("user_pals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  palId: integer("pal_id")
    .notNull()
    .references(() => pals.id, { onDelete: "cascade" }),
  nickname: text("nickname"),
  gender: text("gender").notNull().default("Male"),
  level: integer("level").notNull().default(1),
  hpIv: integer("hp_iv").notNull().default(0),
  attackIv: integer("attack_iv").notNull().default(0),
  defenseIv: integer("defense_iv").notNull().default(0),
});

/** Junction table linking user's extracted pal to passive skills in raw_passive_skills with foreign key constraints. */
export const userPalPassives = sqliteTable(
  "user_pal_passives",
  {
    userPalId: integer("user_pal_id")
      .notNull()
      .references(() => userPals.id, { onDelete: "cascade" }),
    passiveSkillId: integer("passive_skill_id")
      .notNull()
      .references(() => passiveSkills.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.userPalId, table.passiveSkillId] }),
    index("user_pal_passives_passive_skill_id_idx").on(table.passiveSkillId),
  ],
);
