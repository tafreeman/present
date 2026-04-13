/**
 * Content registry — maps content pack IDs to their JSON data and
 * structure files. Supports runtime content swapping via the ControlPanel.
 *
 * Only migrated decks (those with structure.js + content.json) are registered.
 * Non-migrated decks are invisible to the content swap system.
 */

import type { DeckContent } from "./content-types.ts";
import { mergeDeckContent } from "./merge-deck-content.ts";
import type { MergedDeck } from "./merge-deck-content.ts";
import { validateContentPack, validateLayoutsExist } from "../patterns/decks/schema.ts";
import { layoutRegistry } from "../layouts/registry.ts";

// ── Content packs (static JSON imports) ─────────────────────────────────
import currentContent from "./current/content.json";
import genaiContent from "./genai-advocacy/content.json";
import engineeringContent from "./engineering/content.json";
import onboardingContent from "./onboarding/content.json";
import atelierSageContent from "./atelier-sage/content.json";
import signalCobaltContent from "./signal-cobalt/content.json";
import vergePopContent from "./verge-pop/content.json";
import studioContent from "./studio/content.json";

// ── Structure files ─────────────────────────────────────────────────────
import { structure as currentStructure } from "./current/structure.js";
import { structure as genaiStructure } from "./genai-advocacy/structure.js";
import { structure as engineeringStructure } from "./engineering/structure.js";
import { structure as onboardingStructure } from "./onboarding/structure.js";
import { structure as atelierSageStructure } from "./atelier-sage/structure.js";
import { structure as signalCobaltStructure } from "./signal-cobalt/structure.js";
import { structure as vergePopStructure } from "./verge-pop/structure.js";
import { structure as studioStructure } from "./studio/structure.js";

// ── Registry types ──────────────────────────────────────────────────────

export interface ContentPack {
  readonly id: string;
  readonly label: string;
  readonly slideIds: readonly string[];
  readonly data: DeckContent;
}

interface DeckStructureEntry {
  readonly id: string;
  readonly structure: Parameters<typeof mergeDeckContent>[0];
  readonly defaultContentId: string;
  readonly slideIds: readonly string[];
}

// ── Build registries ────────────────────────────────────────────────────

// ── Content pack factory ────────────────────────────────────────────────
//
// Validates each raw JSON import at registration time (soft validation —
// logs warnings, never throws, so a single bad content file doesn't
// prevent the rest of the app from loading).

function makeContentPack(
  id: string,
  label: string,
  raw: unknown,
): ContentPack {
  validateContentPack(id, raw);
  const data = raw as DeckContent;
  return { id, label, slideIds: Object.keys(data.slides), data };
}

export const CONTENT_PACKS: Record<string, ContentPack> = {
  current:        makeContentPack("current",        "Current (Advocacy)",  currentContent),
  genai:          makeContentPack("genai",           "GenAI Case Study",    genaiContent),
  engineering:    makeContentPack("engineering",     "Engineering",         engineeringContent),
  onboarding:     makeContentPack("onboarding",      "Onboarding",          onboardingContent),
  "atelier-sage": makeContentPack("atelier-sage",    "Atelier Sage",        atelierSageContent),
  "signal-cobalt":makeContentPack("signal-cobalt",   "Signal Cobalt",       signalCobaltContent),
  "verge-pop":    makeContentPack("verge-pop",       "Verge Pop",           vergePopContent),
  studio:         makeContentPack("studio",          "Studio Handbook",     studioContent),
};

export const DECK_STRUCTURES: Record<string, DeckStructureEntry> = {
  current: {
    id: "current",
    structure: currentStructure,
    defaultContentId: "current",
    slideIds: currentStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  genai: {
    id: "genai",
    structure: genaiStructure,
    defaultContentId: "genai",
    slideIds: genaiStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  engineering: {
    id: "engineering",
    structure: engineeringStructure,
    defaultContentId: "engineering",
    slideIds: engineeringStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  onboarding: {
    id: "onboarding",
    structure: onboardingStructure,
    defaultContentId: "onboarding",
    slideIds: onboardingStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  "atelier-sage": {
    id: "atelier-sage",
    structure: atelierSageStructure,
    defaultContentId: "atelier-sage",
    slideIds: atelierSageStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  "signal-cobalt": {
    id: "signal-cobalt",
    structure: signalCobaltStructure,
    defaultContentId: "signal-cobalt",
    slideIds: signalCobaltStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  "verge-pop": {
    id: "verge-pop",
    structure: vergePopStructure,
    defaultContentId: "verge-pop",
    slideIds: vergePopStructure.contentSlides.map((s: { id: string }) => s.id),
  },
  studio: {
    id: "studio",
    structure: studioStructure,
    defaultContentId: "studio",
    slideIds: studioStructure.contentSlides.map((s: { id: string }) => s.id),
  },
};

// ── Content listing (graceful fallback mode) ────────────────────────────

/**
 * Returns all content packs available for swapping onto a deck.
 * With graceful fallback, any content pack can be applied — unmatched
 * slides keep their original text. The `matchCount` field lets the UI
 * show how many slides will get swapped content.
 */
export function getAvailableContent(deckKey: string): Array<ContentPack & { matchCount: number; totalSlides: number }> {
  const structureEntry = DECK_STRUCTURES[deckKey];
  if (!structureEntry) return []; // non-migrated deck — no content swapping

  const requiredIds = structureEntry.slideIds;
  const total = requiredIds.length;

  return Object.values(CONTENT_PACKS).map((pack) => {
    const packIds = new Set(pack.slideIds);
    const matchCount = requiredIds.filter((id) => packIds.has(id)).length;
    return { ...pack, matchCount, totalSlides: total };
  });
}

/**
 * Check whether a deck supports content swapping (has a registered structure).
 */
export function isContentSwappable(deckKey: string): boolean {
  return deckKey in DECK_STRUCTURES;
}

/**
 * Build a merged deck from a structure + content pack at runtime.
 * Unmatched slides show structure-only (label as title) — no fallback
 * to the deck's original content.
 */
export function buildDeckFromContent(
  deckKey: string,
  contentId: string,
): MergedDeck | null {
  const structureEntry = DECK_STRUCTURES[deckKey];
  const contentPack = CONTENT_PACKS[contentId];
  if (!structureEntry || !contentPack) return null;

  // Validate that all layout IDs in the structure are registered.
  // Catches layout typos in structure.js files at runtime rather than
  // silently rendering the LayoutRenderer error fallback.
  validateLayoutsExist(
    {
      themeId: structureEntry.id,
      slides: structureEntry.structure.contentSlides as Array<{ id: string; layout: string }>,
    },
    layoutRegistry,
  );

  return mergeDeckContent(structureEntry.structure, contentPack.data);
}

/**
 * Get the default content ID for a migrated deck.
 */
export function getDefaultContentId(deckKey: string): string | null {
  return DECK_STRUCTURES[deckKey]?.defaultContentId ?? null;
}
