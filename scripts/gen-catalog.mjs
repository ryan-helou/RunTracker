// Generates src/lib/catalog.ts from data/speedrun-research.json (the verified
// speedrun.com research output). Curated selection below: platform (Physical/
// Digital) and difficulty variants are collapsed to one entry since their split
// lists are identical; the meaningful Shortcuts/No-Shortcuts distinction is kept.
//
// Re-run with:  node scripts/gen-catalog.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const research = JSON.parse(
  readFileSync(join(root, "data/speedrun-research.json"), "utf8"),
);
const cats = research.categories;

function pick(game, sourceCategory) {
  const c = cats.find((x) => x.game === game && x.category === sourceCategory);
  if (!c) throw new Error(`Not found in research: ${game} :: ${sourceCategory}`);
  return c.splits.map((s) => s.name);
}

// Per-world NSMBW categories (run a single world). Standard in-world level
// order; corroborated by the "All Regular Exits" + "100%" research data.
const NSMBW_WORLDS = [
  ["1", ["1-1", "1-2", "1-3", "1-Tower", "1-4", "1-5", "1-6", "1-Castle"]],
  ["2", ["2-1", "2-2", "2-3", "2-Tower", "2-4", "2-5", "2-6", "2-Castle"]],
  ["3", ["3-1", "3-2", "3-3", "3-Ghost House", "3-Tower", "3-4", "3-5", "3-Castle"]],
  ["4", ["4-1", "4-2", "4-3", "4-Tower", "4-4", "4-Ghost House", "4-5", "4-Castle", "4-Airship"]],
  ["5", ["5-1", "5-2", "5-3", "5-Tower", "5-4", "5-Ghost House", "5-5", "5-Castle"]],
  ["6", ["6-1", "6-2", "6-3", "6-4", "6-Tower", "6-5", "6-6", "6-Castle", "6-Airship"]],
  ["7", ["7-1", "7-2", "7-3", "7-Tower", "7-Ghost House", "7-4", "7-5", "7-6", "7-Castle"]],
  ["8", ["8-1", "8-2", "8-3", "8-Tower", "8-4", "8-5", "8-6", "8-7", "8-Airship", "8-Bowser's Castle"]],
  ["9", ["9-1", "9-2", "9-3", "9-4", "9-5", "9-6", "9-7", "9-8"]],
];
const nsmbwWorldCats = NSMBW_WORLDS.map(([n, levels]) => ({
  key: `world-${n}`,
  name: `World ${n}`,
  description: `All ${levels.length} levels of World ${n}.`,
  splits: levels,
}));

const GAMES = [
  {
    key: "nsmbw",
    name: "New Super Mario Bros. Wii",
    shortName: "NSMBW",
    blurb: "Side-scrolling platformer. Split on each level, tower, castle, and cannon.",
    accent: "#ff5a4d",
    game: "New Super Mario Bros. Wii",
    categories: [
      { key: "any", name: "Any%", description: "Cannon route — skips Worlds 2–4 and 6–7.", src: "Any% - Physical (base category Any%, subcategory Physical)" },
      { key: "any-no-w5", name: "Any% (No W5)", description: "Any% without the World 5 cannon.", src: "Any% No W5 - Physical" },
      { key: "cannonless", name: "Cannonless", description: "No warp cannons — every world played.", src: "Cannonless - Physical" },
      { key: "low", name: "Low%", description: "Minimum completion.", src: "Low% (subcategory: Physical)" },
      { key: "100", name: "100%", description: "All Star Coins and exits.", src: "100% (Physical)" },
      { key: "all-regular-exits", name: "All Regular Exits", description: "Every standard level exit.", src: "All Regular Exits - Digital" },
      { key: "any-coop", name: "Any% (Multiplayer)", description: "Co-op Any% route.", src: "Any% Multiplayer - Physical" },
      ...nsmbwWorldCats,
    ],
  },
  {
    key: "mkw",
    name: "Mario Kart Wii",
    shortName: "MKW",
    blurb: "Split on each track. Cups, Nitro/Retro halves, the full 32, and 100%.",
    accent: "#4d9bff",
    game: "Mario Kart Wii",
    categories: [
      // Glitchless only — Shortcut/ultra-skip variants omitted.
      { key: "32-tracks", name: "32 Tracks", description: "Every track in cup order.", src: "32 Tracks - No Skips" },
      { key: "nitro-tracks", name: "Nitro Tracks", description: "Mushroom, Flower, Star, Special cups.", src: "Nitro Tracks - No Skips" },
      { key: "retro-tracks", name: "Retro Tracks", description: "Shell, Banana, Leaf, Lightning cups.", src: "Retro Tracks - No Skips" },
      { key: "100", name: "100%", description: "All cups across every cc + mirror + time trials.", src: "100%" },
      { key: "cup-mushroom", name: "Mushroom Cup", src: "Mushroom Cup - No Skips" },
      { key: "cup-flower", name: "Flower Cup", src: "Flower Cup - No Skips" },
      { key: "cup-star", name: "Star Cup", src: "Star Cup - No Skips" },
      { key: "cup-special", name: "Special Cup", src: "Special Cup - No Skips" },
      { key: "cup-shell", name: "Shell Cup", src: "Shell Cup - No Skips" },
      { key: "cup-banana", name: "Banana Cup", src: "Banana Cup - No Skips" },
      { key: "cup-leaf", name: "Leaf Cup", src: "Leaf Cup - No Skips" },
      { key: "cup-lightning", name: "Lightning Cup", src: "Lightning Cup - No Skips" },
    ],
  },
  {
    key: "mp9",
    name: "Mario Party 9",
    shortName: "MP9",
    blurb: "Solo & Party boards, Boss Rush, and minigame modes. Split on each segment.",
    accent: "#b07cff",
    game: "Mario Party 9",
    categories: [
      { key: "solo-mode", name: "Solo Mode", description: "All 6 Solo Mode boards.", src: "Solo Mode" },
      { key: "party-all-boards", name: "Party Mode (All Boards)", description: "All 7 boards including DK's Jungle Ruins.", src: "Party Mode - All Boards - Easy" },
      { key: "boss-rush-all", name: "Boss Rush (All Bosses)", src: "Boss Rush - All Bosses" },
      { key: "boss-rush-stage", name: "Boss Rush (Stage Bosses)", src: "Boss Rush - Stage Bosses" },
      { key: "boss-rush-mid", name: "Boss Rush (Mid Bosses)", src: "Boss Rush - Mid Bosses" },
      { key: "time-attack", name: "Time Attack", description: "Time Attack minigame set.", src: "Time Attack" },
      { key: "perspective", name: "Perspective Mode", description: "Perspective minigame set.", src: "Perspective Mode" },
    ],
  },
];

let body = "";
for (const g of GAMES) {
  const catLines = g.categories
    .map((c) => {
      const names = c.splits ? c.splits : pick(g.game, c.src);
      const splits = names.map((n) => JSON.stringify(n)).join(", ");
      const desc = c.description ? `\n        description: ${JSON.stringify(c.description)},` : "";
      return `      {
        key: ${JSON.stringify(c.key)},
        name: ${JSON.stringify(c.name)},${desc}
        timingMethod: "RTA",
        splits: s(${splits}),
      },`;
    })
    .join("\n");
  body += `  {
    key: ${JSON.stringify(g.key)},
    name: ${JSON.stringify(g.name)},
    shortName: ${JSON.stringify(g.shortName)},
    blurb: ${JSON.stringify(g.blurb)},
    accent: ${JSON.stringify(g.accent)},
    categories: [
${catLines}
    ],
  },
`;
}

const out = `/**
 * Static catalog of games, speedrun categories, and their ordered split lists.
 *
 * GENERATED from data/speedrun-research.json (verified speedrun.com research).
 * Re-generate with:  node scripts/gen-catalog.mjs
 *
 * Rule: only categories with 2+ splits are included (no single individual
 * levels). Category/game \`key\`s are stable slugs persisted as game_key /
 * category_key on runs — do not rename them without a data migration.
 */

export type TimingMethod = "RTA" | "IGT" | "LRT";

export interface SplitDef {
  name: string;
  note?: string;
}

export interface CategoryDef {
  key: string;
  name: string;
  description?: string;
  timingMethod: TimingMethod;
  splits: SplitDef[];
}

export interface GameDef {
  key: string;
  name: string;
  shortName: string;
  blurb: string;
  accent: string;
  categories: CategoryDef[];
}

const s = (...names: string[]): SplitDef[] => names.map((name) => ({ name }));

export const GAMES: GameDef[] = [
${body}];

export function getGame(key: string): GameDef | undefined {
  return GAMES.find((g) => g.key === key);
}

export function getCategory(
  gameKey: string,
  categoryKey: string,
): { game: GameDef; category: CategoryDef } | undefined {
  const game = getGame(gameKey);
  if (!game) return undefined;
  const category = game.categories.find((c) => c.key === categoryKey);
  if (!category) return undefined;
  return { game, category };
}
`;

writeFileSync(join(root, "src/lib/catalog.ts"), out);
const total = GAMES.reduce((n, g) => n + g.categories.length, 0);
console.log(`Wrote src/lib/catalog.ts — ${GAMES.length} games, ${total} categories.`);
