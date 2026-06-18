/**
 * Static catalog of games, speedrun categories, and their ordered split lists.
 *
 * GENERATED from data/speedrun-research.json (verified speedrun.com research).
 * Re-generate with:  node scripts/gen-catalog.mjs
 *
 * Rule: only categories with 2+ splits are included (no single individual
 * levels). Category/game `key`s are stable slugs persisted as game_key /
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
  {
    key: "nsmbw",
    name: "New Super Mario Bros. Wii",
    shortName: "NSMBW",
    blurb: "Side-scrolling platformer. Split on each level, tower, castle, and cannon.",
    accent: "#ff5a4d",
    categories: [
      {
        key: "any",
        name: "Any%",
        description: "Cannon route — skips Worlds 2–4 and 6–7.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3 (Secret Exit)", "1-Cannon", "5-1", "5-2", "5-3", "5-Fortress", "5-4", "5-Ghost House (Secret Exit)", "5-Cannon", "8-1", "8-2 (Secret Exit)", "8-7", "8-Airship", "8-Bowser's Castle"),
      },
      {
        key: "any-no-w5",
        name: "Any% (No W5)",
        description: "Any% without the World 5 cannon.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3", "1-Star House (Star House)", "1-Fortress (Tower)", "1-4", "1-6", "1-Castle", "2-1", "2-3", "2-Fortress (Tower)", "2-4", "2-Castle", "3-1", "3-2", "3-Ghost House (3-GH)", "3-Cannon", "6-1", "6-3", "6-Fortress (Tower)", "6-5", "6-6", "6-Cannon", "8-1", "8-2", "8-7", "8-Airship", "8-Bowser's Castle"),
      },
      {
        key: "cannonless",
        name: "Cannonless",
        description: "No warp cannons — every world played.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3", "Star House (W1)", "1-Tower", "1-4", "1-6", "1-Castle", "2-1", "2-3", "2-Tower", "2-4 (Secret Exit)", "2-Castle", "3-1", "3-2", "3-Tower", "3-4 (Secret Exit)", "3-5", "Red Switch (W3)", "3-4 (Normal Exit)", "3-Castle", "4-1", "4-2", "4-Tower", "4-4", "4-Ghost House (Secret Exit)", "Star House (W4)", "4-Castle", "4-Airship", "5-1", "5-3", "5-Tower", "5-4", "5-Ghost House", "5-5", "5-Castle", "6-1", "6-3", "6-Tower", "6-5 (Secret Exit)", "6-Castle", "6-Airship", "7-1", "7-2", "7-3", "7-Tower (Secret Exit)", "7-6", "7-Castle", "8-1", "8-2 (Secret Exit)", "8-7", "8-Airship", "8-Castle (Bowser)"),
      },
      {
        key: "low",
        name: "Low%",
        description: "Minimum completion.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3 (secret exit)", "1-Cannon", "5-1", "5-2", "5-Tower (Fortress)", "5-4", "5-Ghost House (secret exit)", "5-Cannon", "8-1", "8-2 (secret exit)", "8-7", "8-Airship", "8-Bowser's Castle"),
      },
      {
        key: "100",
        name: "100%",
        description: "All Star Coins and exits.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3 (N)", "1-T", "1-4", "1-6", "1-5", "1-C", "2-1", "2-3", "2-T", "2-4 (N)", "2-6 (S)", "2-6 (N)", "2-5", "2-4 (S)", "2-C", "3-1", "3-2", "3-3", "3-G (S)", "3-Cannon", "3-G (N)", "3-T", "3-4 (S)", "3-5 (N)", "3-5 (S)", "3-4 (N)", "3-C", "4-1", "4-2", "4-T (N)", "4-4", "4-G (N)", "4-G (S)", "4-5", "4-C", "4-Air", "5-1", "5-2", "5-T", "5-4", "5-G (N)", "5-5", "5-C", "6-1", "6-3", "6-2", "6-4", "6-T", "6-5 (S)", "6-C", "6-Air", "7-1", "7-2", "7-3", "7-T (S)", "7-6", "7-T (N)", "7-G (S)", "7-G (N)", "7-4", "7-5", "7-C", "8-1", "8-2 (S)", "8-7", "8-2 (N)", "8-3", "8-T", "8-4", "8-5", "8-6", "8-Air", "8-C", "1-3 (S)", "1-Cannon", "2-2", "2-Cannon", "4-3", "4-T (S)", "4-Cannon", "6-5 (N)", "6-6 (N)", "6-6 (S)", "6-Cannon", "5-3", "5-G (S)", "5-Cannon", "9-5", "9-3", "9-1", "9-2", "9-6", "9-8", "9-7", "9-4"),
      },
      {
        key: "all-regular-exits",
        name: "All Regular Exits",
        description: "Every standard level exit.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3", "1-Tower", "1-4", "1-5", "1-6", "1-Castle", "2-1", "2-2", "2-3", "2-Tower", "2-4", "2-5", "2-6", "2-Castle", "3-1", "3-2", "3-3", "3-Ghost House", "3-Tower", "3-4", "3-5", "3-Castle", "4-1", "4-2", "4-3", "4-Tower", "4-4", "4-Ghost House", "4-5", "4-Castle", "4-Airship", "5-1", "5-2", "5-3", "5-Tower", "5-4", "5-Ghost House", "5-5", "5-Castle", "6-1", "6-2", "6-3", "6-4", "6-Tower", "6-5", "6-6", "6-Castle", "6-Airship", "7-1", "7-2", "7-3", "7-Tower", "7-Ghost House", "7-4", "7-5", "7-6", "7-Castle", "8-1", "8-2", "8-7", "8-Airship", "8-3", "8-Tower", "8-4", "8-5", "8-6", "8-Bowser's Castle"),
      },
      {
        key: "any-coop",
        name: "Any% (Multiplayer)",
        description: "Co-op Any% route.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3 (Secret)", "1-Cannon", "5-1", "5-3", "5-Tower", "5-4", "5-Ghost House (Secret)", "5-Cannon", "8-1", "8-2 (Secret)", "8-7", "8-Airship", "8-Bowser's Castle"),
      },
      {
        key: "world-1",
        name: "World 1",
        description: "All 8 levels of World 1.",
        timingMethod: "RTA",
        splits: s("1-1", "1-2", "1-3", "1-Tower", "1-4", "1-5", "1-6", "1-Castle"),
      },
      {
        key: "world-2",
        name: "World 2",
        description: "All 8 levels of World 2.",
        timingMethod: "RTA",
        splits: s("2-1", "2-2", "2-3", "2-Tower", "2-4", "2-5", "2-6", "2-Castle"),
      },
      {
        key: "world-3",
        name: "World 3",
        description: "All 8 levels of World 3.",
        timingMethod: "RTA",
        splits: s("3-1", "3-2", "3-3", "3-Ghost House", "3-Tower", "3-4", "3-5", "3-Castle"),
      },
      {
        key: "world-4",
        name: "World 4",
        description: "All 9 levels of World 4.",
        timingMethod: "RTA",
        splits: s("4-1", "4-2", "4-3", "4-Tower", "4-4", "4-Ghost House", "4-5", "4-Castle", "4-Airship"),
      },
      {
        key: "world-5",
        name: "World 5",
        description: "All 8 levels of World 5.",
        timingMethod: "RTA",
        splits: s("5-1", "5-2", "5-3", "5-Tower", "5-4", "5-Ghost House", "5-5", "5-Castle"),
      },
      {
        key: "world-6",
        name: "World 6",
        description: "All 9 levels of World 6.",
        timingMethod: "RTA",
        splits: s("6-1", "6-2", "6-3", "6-4", "6-Tower", "6-5", "6-6", "6-Castle", "6-Airship"),
      },
      {
        key: "world-7",
        name: "World 7",
        description: "All 9 levels of World 7.",
        timingMethod: "RTA",
        splits: s("7-1", "7-2", "7-3", "7-Tower", "7-Ghost House", "7-4", "7-5", "7-6", "7-Castle"),
      },
      {
        key: "world-8",
        name: "World 8",
        description: "All 10 levels of World 8.",
        timingMethod: "RTA",
        splits: s("8-1", "8-2", "8-3", "8-Tower", "8-4", "8-5", "8-6", "8-7", "8-Airship", "8-Bowser's Castle"),
      },
      {
        key: "world-9",
        name: "World 9",
        description: "All 8 levels of World 9.",
        timingMethod: "RTA",
        splits: s("9-1", "9-2", "9-3", "9-4", "9-5", "9-6", "9-7", "9-8"),
      },
    ],
  },
  {
    key: "mkw",
    name: "Mario Kart Wii",
    shortName: "MKW",
    blurb: "Split on each track. Cups, Nitro/Retro halves, the full 32, and 100%.",
    accent: "#4d9bff",
    categories: [
      {
        key: "32-tracks",
        name: "32 Tracks",
        description: "Every track in cup order.",
        timingMethod: "RTA",
        splits: s("Luigi Circuit", "Moo Moo Meadows", "Mushroom Gorge", "Toad's Factory", "Mario Circuit", "Coconut Mall", "DK Summit", "Wario's Gold Mine", "Daisy Circuit", "Koopa Cape", "Maple Treeway", "Grumble Volcano", "Dry Dry Ruins", "Moonview Highway", "Bowser's Castle", "Rainbow Road", "GCN Peach Beach", "DS Yoshi Falls", "SNES Ghost Valley 2", "N64 Mario Raceway", "N64 Sherbet Land", "GBA Shy Guy Beach", "DS Delfino Square", "GCN Waluigi Stadium", "DS Desert Hills", "GBA Bowser Castle 3", "N64 DK's Jungle Parkway", "GCN Mario Circuit", "SNES Mario Circuit 3", "DS Peach Gardens", "GCN DK Mountain", "N64 Bowser's Castle"),
      },
      {
        key: "nitro-tracks",
        name: "Nitro Tracks",
        description: "Mushroom, Flower, Star, Special cups.",
        timingMethod: "RTA",
        splits: s("Luigi Circuit", "Moo Moo Meadows", "Mushroom Gorge", "Toad's Factory", "Mario Circuit", "Coconut Mall", "DK Summit", "Wario's Gold Mine", "Daisy Circuit", "Koopa Cape", "Maple Treeway", "Grumble Volcano", "Dry Dry Ruins", "Moonview Highway", "Bowser's Castle", "Rainbow Road"),
      },
      {
        key: "retro-tracks",
        name: "Retro Tracks",
        description: "Shell, Banana, Leaf, Lightning cups.",
        timingMethod: "RTA",
        splits: s("GCN Peach Beach", "DS Yoshi Falls", "SNES Ghost Valley 2", "N64 Mario Raceway", "N64 Sherbet Land", "GBA Shy Guy Beach", "DS Delfino Square", "GCN Waluigi Stadium", "DS Desert Hills", "GBA Bowser Castle 3", "N64 DK's Jungle Parkway", "GCN Mario Circuit", "SNES Mario Circuit 3", "DS Peach Gardens", "GCN DK Mountain", "N64 Bowser's Castle"),
      },
      {
        key: "100",
        name: "100%",
        description: "All cups across every cc + mirror + time trials.",
        timingMethod: "RTA",
        splits: s("Time Trials (Funky Unlock)", "150cc Mushroom Cup", "150cc Shell Cup", "150cc Banana Cup", "150cc Flower Cup", "150cc Star Cup", "150cc Leaf Cup", "150cc Lightning Cup", "150cc Special Cup", "Time Trials (Remaining 32 Tracks)", "Mirror Mushroom Cup", "Mirror Shell Cup", "Mirror Banana Cup", "Mirror Flower Cup", "Mirror Star Cup", "Mirror Leaf Cup", "Mirror Lightning Cup", "Mirror Special Cup", "50cc Mushroom Cup", "50cc Shell Cup", "50cc Banana Cup", "50cc Flower Cup", "50cc Star Cup", "50cc Leaf Cup", "50cc Lightning Cup", "50cc Special Cup", "100cc Mushroom Cup", "100cc Shell Cup", "100cc Banana Cup", "100cc Flower Cup", "100cc Star Cup", "100cc Leaf Cup", "100cc Lightning Cup", "100cc Special Cup"),
      },
      {
        key: "cup-mushroom",
        name: "Mushroom Cup",
        timingMethod: "RTA",
        splits: s("Luigi Circuit", "Moo Moo Meadows", "Mushroom Gorge", "Toad's Factory"),
      },
      {
        key: "cup-flower",
        name: "Flower Cup",
        timingMethod: "RTA",
        splits: s("Mario Circuit", "Coconut Mall", "DK Summit", "Wario's Gold Mine"),
      },
      {
        key: "cup-star",
        name: "Star Cup",
        timingMethod: "RTA",
        splits: s("Daisy Circuit", "Koopa Cape", "Maple Treeway", "Grumble Volcano"),
      },
      {
        key: "cup-special",
        name: "Special Cup",
        timingMethod: "RTA",
        splits: s("Dry Dry Ruins", "Moonview Highway", "Bowser's Castle", "Rainbow Road"),
      },
      {
        key: "cup-shell",
        name: "Shell Cup",
        timingMethod: "RTA",
        splits: s("GCN Peach Beach", "DS Yoshi Falls", "SNES Ghost Valley 2", "N64 Mario Raceway"),
      },
      {
        key: "cup-banana",
        name: "Banana Cup",
        timingMethod: "RTA",
        splits: s("N64 Sherbet Land", "GBA Shy Guy Beach", "DS Delfino Square", "GCN Waluigi Stadium"),
      },
      {
        key: "cup-leaf",
        name: "Leaf Cup",
        timingMethod: "RTA",
        splits: s("DS Desert Hills", "GBA Bowser Castle 3", "N64 DK's Jungle Parkway", "GCN Mario Circuit"),
      },
      {
        key: "cup-lightning",
        name: "Lightning Cup",
        timingMethod: "RTA",
        splits: s("SNES Mario Circuit 3", "DS Peach Gardens", "GCN DK Mountain", "N64 Bowser's Castle"),
      },
    ],
  },
  {
    key: "mp9",
    name: "Mario Party 9",
    shortName: "MP9",
    blurb: "Solo & Party boards, Boss Rush, and minigame modes. Split on each segment.",
    accent: "#b07cff",
    categories: [
      {
        key: "solo-mode",
        name: "Solo Mode",
        description: "All 6 Solo Mode boards.",
        timingMethod: "RTA",
        splits: s("Toad Road", "Bob-omb Factory", "Boo's Horror Castle", "Blooper Beach", "Magma Mine", "Bowser Station"),
      },
      {
        key: "party-all-boards",
        name: "Party Mode (All Boards)",
        description: "All 7 boards including DK's Jungle Ruins.",
        timingMethod: "RTA",
        splits: s("Toad Road", "Bob-omb Factory", "Boo's Horror Castle", "Blooper Beach", "Magma Mine", "Bowser Station", "DK's Jungle Ruins"),
      },
      {
        key: "boss-rush-all",
        name: "Boss Rush (All Bosses)",
        timingMethod: "RTA",
        splits: s("Sock It to Lakitu", "Wiggler Bounce", "Whomp Stomp", "Bombard King Bob-omb", "Deck Dry Bones", "King Boo's Puzzle Attack", "Cheep Cheep Shot", "Blooper Barrage", "Spike Strike", "Chain Chomp Romp", "Bowser Jr. Breakdown", "Bowser's Block Battle"),
      },
      {
        key: "boss-rush-stage",
        name: "Boss Rush (Stage Bosses)",
        timingMethod: "RTA",
        splits: s("Wiggler", "King Bob-omb", "King Boo", "Blooper", "Chain Chomp", "Bowser"),
      },
      {
        key: "boss-rush-mid",
        name: "Boss Rush (Mid Bosses)",
        timingMethod: "RTA",
        splits: s("Lakitu", "Whomp", "Dry Bones", "Cheep Cheep", "Spike", "Bowser Jr."),
      },
      {
        key: "time-attack",
        name: "Time Attack",
        description: "Time Attack minigame set.",
        timingMethod: "RTA",
        splits: s("Snow Go", "Jigsaw Jumble", "Peak Precision", "Speeding Bullets", "Chain Event", "Ballistic Beach", "Upward Mobility", "Pizza Me, Mario", "Flinger Painting", "Pit or Platter"),
      },
      {
        key: "perspective",
        name: "Perspective Mode",
        description: "Perspective minigame set.",
        timingMethod: "RTA",
        splits: s("Tumble Temple", "Logger Heads", "Ring Leader", "Magma Mayhem", "Pianta Pool", "Piranha Patch", "Skyjinks", "Plunder Ground", "Billistics", "Mob Sleds"),
      },
    ],
  },
];

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
