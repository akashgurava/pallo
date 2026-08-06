/** Response shape from GET /api/stats */
export interface Stats {
  totalPals: number;
  failedPals: number;
  failedPalNames: string[];
  elementCounts: Record<string, number>;
  workTypeCounts: Record<string, number>;
  mountCounts: Record<string, number>;
  breedingCombos: number;
  breedingMissing: number;
  totalPassives: number;
  implantPassives: number;
  worldTreePassives: number;
  mutationPassives: number;
  lastRefresh: string | null;
}

export interface WorkSuitability {
  workType: string;
  level: number;
}

export interface PalListEntry {
  number: string;
  variant: string | null;
  name: string;
  elements: string[];
  workSuitabilities: WorkSuitability[];
}

export interface MountInfo {
  type: string;
  unlockLevel: number;
}

export interface PalStatsData {
  size: string | null;
  rarity: number | null;
  health: number | null;
  attack: number | null;
  defense: number | null;
  food: number | null;
  price: number | null;
}

export interface PalMovement {
  slowWalkSpeed: number | null;
  walkSpeed: number | null;
  runSpeed: number | null;
  rideSprintSpeed: number | null;
  transportSpeed: number | null;
  swimSpeed: number | null;
  swimDashSpeed: number | null;
  stamina: number | null;
}

/** Response shape from GET /api/pals */
export interface PalRow {
  id: number;
  number: string;
  variant: string | null;
  name: string;
  elements: string[];
  workSuitabilities: WorkSuitability[];
  mounts: MountInfo[];
  stats: PalStatsData | null;
  movement: PalMovement | null;
}
