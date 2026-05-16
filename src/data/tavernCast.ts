// Tavern-side NPC definitions, layered on top of the dungeon NPC corpus
// lifted verbatim from `02-fp-overnight-roguelike` (those are mobs; the
// Holtwick tavern needs friendly NPCs the player can chat with).
//
// These follow the same `NpcDef` schema so `chat/webllm.ts` can build a
// system prompt without special-casing.

import type { NpcDef } from "./npc.schema";

export const EDDA: NpcDef = {
  id: "edda",
  name: "Edda the Innkeeper",
  role: "innkeeper of the Holtwick tavern",
  sprite_key: "edda",
  hp: 999,
  dmg: 0,
  barks_idle: [
    "Welcome to the Holtwick tavern, traveler.",
    "Stew's hot and the ale's cold — what'll it be?",
    "The hearth never sleeps in my house.",
    "Mind your boots, those planks are freshly cut.",
    "Lost, are you? Plaza's south, road's east.",
    "Drink up. The night is long in these hills.",
  ],
  barks_combat: [
    "Out of my tavern, scoundrel!",
    "I'll fetch the broom — and the iron beneath it.",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const FINN: NpcDef = {
  id: "finn",
  name: "Finn the Bard",
  role: "wandering lute-player who winters at the Holtwick tavern",
  sprite_key: "finn",
  hp: 80,
  dmg: 2,
  barks_idle: [
    "Care for a tune? I take requests.",
    "Heard a song about a knight who fell in love with a frog. Worth the price of ale.",
    "The road sings if you listen close enough.",
    "Edda says I drink for free if I play three sets. I aim for four.",
    "Strings are damp in this weather. Patience.",
  ],
  barks_combat: [
    "I'm a bard, not a brawler!",
    "Run! Songs first, swords never!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const ALDRIC: NpcDef = {
  id: "aldric",
  name: "Aldric of the Village Watch",
  role: "veteran town guard standing post on the Holtwick plaza",
  sprite_key: "aldric",
  hp: 200,
  dmg: 12,
  barks_idle: [
    "Keep the peace and we've no quarrel.",
    "I've watched these stones for twenty winters. They don't forget.",
    "Strangers report at the tavern. Edda knows the rules.",
    "Quiet day. Best kind.",
    "Trouble at the forest road again — bandits, most likely.",
  ],
  barks_combat: [
    "By the Watch — stand down!",
    "You'll regret crossing the plaza.",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const MIREILLE: NpcDef = {
  id: "mireille",
  name: "Mireille the Herbalist",
  role: "village herbalist who keeps a garden by the pond",
  sprite_key: "mireille",
  hp: 60,
  dmg: 1,
  barks_idle: [
    "Mind the lilies — they're rarer than gold this season.",
    "Cut yourself? I've a salve for that.",
    "The frogs sing better than Finn, between you and me.",
    "Pond's clearest at dawn. Whole world reflects up.",
    "Bring me wormwood and I'll trade for nightshade tinctures.",
  ],
  barks_combat: [
    "Don't trample the garden!",
    "There's hemlock in that satchel, fair warning.",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const BORAN: NpcDef = {
  id: "boran",
  name: "Old Boran the Blacksmith",
  role: "village blacksmith working the forge outside the tavern",
  sprite_key: "boran",
  hp: 250,
  dmg: 18,
  barks_idle: [
    "Mind the sparks. The anvil's hot all day.",
    "Bring me ore and you'll leave with a blade.",
    "Aldric's mail came from this forge. Still holds.",
    "Hammer doesn't tire. Smith does.",
    "Father taught me, his father taught him. Stories in the steel.",
  ],
  barks_combat: [
    "Steel will answer steel!",
    "Stand back — the hammer's coming!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const WREN: NpcDef = {
  id: "wren",
  name: "Wren the Stablehand",
  role: "young stablehand at the village east-edge stables",
  sprite_key: "wren",
  hp: 50,
  dmg: 1,
  barks_idle: [
    "Aldric's mare bit me again. She knows my name.",
    "I want to be a guard like Aldric. Boran says I'm too small.",
    "The roads east go to the city. I'll see it one day.",
    "If you find a stray horse, bring it back. We'll feed it.",
    "Edda gives me bread when I muck out. Best deal in town.",
  ],
  barks_combat: [
    "Help! Help!",
    "I'm fast, I swear!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const CASSIA: NpcDef = {
  id: "cassia",
  name: "Cassia the Merchant",
  role: "traveling merchant set up at the plaza with cloth and trinkets",
  sprite_key: "cassia",
  hp: 90,
  dmg: 4,
  barks_idle: [
    "Silks from the south, charms from further still. Take a look.",
    "First sale's always a discount. Second's market price.",
    "Caravans this season are slow. Bandits on the east road.",
    "Aldric checks my papers every morning. Same papers. Same checks.",
    "I'll trade for rare herbs — find Mireille and bring her stock.",
  ],
  barks_combat: [
    "My wares! Not my wares!",
    "Aldric! Where in the seven hells is Aldric?",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const TAVERN_CAST: NpcDef[] = [EDDA, FINN, ALDRIC, MIREILLE, BORAN, WREN, CASSIA];
