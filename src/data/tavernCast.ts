// Tavern-side NPC definitions, layered on top of the dungeon NPC corpus
// lifted verbatim from `02-fp-overnight-roguelike` (those are mobs; the
// Holtwick tavern needs friendly NPCs the player can chat with).
//
// These follow the same `NpcDef` schema so the proxy worker can build a
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

export const KARSTEN: NpcDef = {
  id: "karsten",
  name: "Karsten the Apprentice Smith",
  role: "Boran's apprentice working the forge bellows",
  sprite_key: "karsten",
  hp: 120,
  dmg: 6,
  barks_idle: [
    "Master Boran says the bellows are mine until I burn my hands twice.",
    "Forge runs hot today. Bring water if you've a spare hand.",
    "I'm learning blades. Started on horseshoes — never end on them.",
    "Iron from the east mine sings clean. Ore from the south is stubborn.",
    "Boran trusts me with the anvil for ten breaths at a time. Counting.",
  ],
  barks_combat: [
    "I've a hammer and I know how to swing it!",
    "Master! Master, your apprentice has trouble!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const HILDA: NpcDef = {
  id: "hilda",
  name: "Hilda the Well-Keeper",
  role: "old wisewoman who tends the village well and reads the water",
  sprite_key: "hilda",
  hp: 70,
  dmg: 1,
  barks_idle: [
    "The well is deeper than the village is old. Mind the rope.",
    "Water reads true today. No troubles in the hills.",
    "A coin for the bottom buys a wish. The well decides if it grants.",
    "I knew your grandmother. Don't ask whose — I knew most of them.",
    "Mireille trades me wormwood for clean water. Fair trade.",
  ],
  barks_combat: [
    "Touch the well and the village turns on you.",
    "I've named every stone here. They remember slights.",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const PETRA: NpcDef = {
  id: "petra",
  name: "Petra the Baker",
  role: "village baker selling loaves from a market stall under canopy",
  sprite_key: "petra",
  hp: 80,
  dmg: 1,
  barks_idle: [
    "Rye's fresh, oat's two days. Pick by your purse.",
    "Edda buys six loaves a morning for the tavern. The rest is yours.",
    "Cassia tried to sell me silk for bread once. She left with bread.",
    "Petras's pies are next week — apples aren't ripe yet.",
    "Wake before the rooster and you'll smell the oven first.",
  ],
  barks_combat: [
    "Out of my stall! I've a rolling pin!",
    "Don't crush the dough! Don't you dare!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const RONAN: NpcDef = {
  id: "ronan",
  name: "Ronan the Messenger",
  role: "courier between Holtwick and the eastern towns, set up at a stall",
  sprite_key: "ronan",
  hp: 75,
  dmg: 3,
  barks_idle: [
    "Letters east leave at dawn. Two coppers a page, sealed or open.",
    "Three towns in two days last week. My boots remember every step.",
    "Aldric's watch reads my pouch before I cross. Always has.",
    "If you've kin in Eastreach, I can carry word. Cheaper than walking.",
    "Bandits on the forest road — I take the north pass now.",
  ],
  barks_combat: [
    "I carry letters, not arms!",
    "Touch the satchel and the watch hears about it!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const DORIN: NpcDef = {
  id: "dorin",
  name: "Dorin the Miner",
  role: "weather-worn miner who wanders the plaza between shifts",
  sprite_key: "dorin",
  hp: 110,
  dmg: 5,
  barks_idle: [
    "I struck a vein once. Real silver. Or close enough that it spent.",
    "Down deep, the lamps go strange. Pay them no mind. Or all your mind.",
    "Boran's apprentice has cleaner hands than any miner I know. Suits him.",
    "Edda's stew is the only honest meal in fifty miles. Tell her I said so.",
    "Got any ale? I'll trade a song for ale. The song's mine, mostly.",
  ],
  barks_combat: [
    "Off my claim, scab!",
    "I've swung pickaxes drunker than this, and harder!",
  ],
  chat: true,
  min_floor: 1,
  max_floor: 99,
};

export const TAVERN_CAST: NpcDef[] = [
  EDDA, FINN, ALDRIC, MIREILLE, BORAN, WREN, CASSIA,
  KARSTEN, HILDA, PETRA, RONAN, DORIN,
];
