import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(...values));
}

/** Utility type for components that forward an element ref. */
export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
  ref?: E | null;
};

/** Utility type that removes children and child props. */
export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;
