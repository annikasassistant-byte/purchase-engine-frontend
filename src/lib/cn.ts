import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn-style class combinator: `clsx` for conditional classes,
 * `tailwind-merge` to resolve conflicting Tailwind utilities (last one wins
 * by intent, not by source order). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
