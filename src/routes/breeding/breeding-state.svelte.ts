import type { PalRow } from "$lib/types.js";

interface StoredState {
  parentAId?: number | undefined;
  parentBId?: number | undefined;
  singleParentId?: number | undefined;
  childFilterId?: number | undefined;
  reverseChildId?: number | undefined;
  elements?: string[] | undefined;
  workTypes?: string[] | undefined;
  mounts?: string[] | undefined;
  reverseElements?: string[] | undefined;
  activeTab?: string | undefined;
}

const STORAGE_KEY = "pallo:breeding";

class BreedingState {
  #activeTab = $state("parents-child");
  #parentA = $state<PalRow | null>(null);
  #parentB = $state<PalRow | null>(null);
  #singleParent = $state<PalRow | null>(null);
  #childFilter = $state<PalRow | null>(null);
  #selectedElements = $state<Set<string>>(new Set());
  #selectedWorkTypes = $state<Set<string>>(new Set());
  #selectedMounts = $state<Set<string>>(new Set());
  #reverseChild = $state<PalRow | null>(null);
  #reverseElementFilter = $state<Set<string>>(new Set());
  #pendingChildFilterId: number | null = null;
  #initialized = false;

  get activeTab() {
    return this.#activeTab;
  }
  set activeTab(v: string) {
    this.#activeTab = v;
    this.#save();
  }

  get parentA() {
    return this.#parentA;
  }
  set parentA(v: PalRow | null) {
    this.#parentA = v;
    this.#save();
  }

  get parentB() {
    return this.#parentB;
  }
  set parentB(v: PalRow | null) {
    this.#parentB = v;
    this.#save();
  }

  get singleParent() {
    return this.#singleParent;
  }
  set singleParent(v: PalRow | null) {
    this.#singleParent = v;
    this.#save();
  }

  get childFilter() {
    return this.#childFilter;
  }
  set childFilter(v: PalRow | null) {
    this.#childFilter = v;
    this.#save();
  }

  get selectedElements() {
    return this.#selectedElements;
  }
  set selectedElements(v: Set<string>) {
    this.#selectedElements = v;
    this.#save();
  }

  get selectedWorkTypes() {
    return this.#selectedWorkTypes;
  }
  set selectedWorkTypes(v: Set<string>) {
    this.#selectedWorkTypes = v;
    this.#save();
  }

  get selectedMounts() {
    return this.#selectedMounts;
  }
  set selectedMounts(v: Set<string>) {
    this.#selectedMounts = v;
    this.#save();
  }

  get reverseChild() {
    return this.#reverseChild;
  }
  set reverseChild(v: PalRow | null) {
    this.#reverseChild = v;
    this.#save();
  }

  get reverseElementFilter() {
    return this.#reverseElementFilter;
  }
  set reverseElementFilter(v: Set<string>) {
    this.#reverseElementFilter = v;
    this.#save();
  }

  get pendingChildFilterId() {
    return this.#pendingChildFilterId;
  }

  restore(pals: PalRow[]): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state: StoredState = JSON.parse(raw);
      if (state.parentAId) this.#parentA = pals.find((p) => p.id === state.parentAId) ?? null;
      if (state.parentBId) this.#parentB = pals.find((p) => p.id === state.parentBId) ?? null;
      if (state.singleParentId)
        this.#singleParent = pals.find((p) => p.id === state.singleParentId) ?? null;
      if (state.reverseChildId)
        this.#reverseChild = pals.find((p) => p.id === state.reverseChildId) ?? null;
      if (state.elements) this.#selectedElements = new Set(state.elements);
      if (state.workTypes) this.#selectedWorkTypes = new Set(state.workTypes);
      if (state.mounts) this.#selectedMounts = new Set(state.mounts);
      if (state.reverseElements) this.#reverseElementFilter = new Set(state.reverseElements);
      if (state.activeTab) this.#activeTab = state.activeTab;
      if (state.childFilterId) this.#pendingChildFilterId = state.childFilterId;
    } catch {
      // ignore corrupt storage
    }
    this.#initialized = true;
  }

  restoreChildFilter(pals: PalRow[]): void {
    if (this.#pendingChildFilterId && this.#singleParent && pals.length > 0) {
      this.#childFilter = pals.find((p) => p.id === this.#pendingChildFilterId) ?? null;
      this.#pendingChildFilterId = null;
    }
  }

  #save(): void {
    if (!this.#initialized || typeof window === "undefined") return;
    const state: StoredState = {
      parentAId: this.#parentA?.id,
      parentBId: this.#parentB?.id,
      singleParentId: this.#singleParent?.id,
      childFilterId: this.#childFilter?.id,
      reverseChildId: this.#reverseChild?.id,
      elements: [...this.#selectedElements],
      workTypes: [...this.#selectedWorkTypes],
      mounts: [...this.#selectedMounts],
      reverseElements: [...this.#reverseElementFilter],
      activeTab: this.#activeTab,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export const breedingState = new BreedingState();
