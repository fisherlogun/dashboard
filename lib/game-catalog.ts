export const GAME_EVENTS = [
  { id: "cash2x", name: "2x Cash" },
  { id: "items2x", name: "2x Items" },
  { id: "luck2x", name: "2x Luck" },
  { id: "frenzy", name: "Feeding Frenzy" },
] as const

export const ISLANDS = [
  { id: "reef", name: "Coral Cove" },
  { id: "wreck", name: "Wreckers' Key" },
  { id: "caverns", name: "Ember Isle" },
  { id: "deep", name: "Stormwatch Isle" },
  { id: "trench", name: "Midnight Isle" },
  { id: "atlantis", name: "Atlantis Gate" },
  { id: "aurora_reach", name: "Aurora Reach" },
] as const

export const BREWS = [
  { id: "luck", name: "Lucky Kelp Brew" },
  { id: "air", name: "Deep Breath Tonic" },
  { id: "swift", name: "Swift Fin Draught" },
  { id: "sonar", name: "Sonar Sight Elixir", description: "sonar range x1.5" },
  { id: "haggle", name: "Merchant's Honey" },
] as const

export const GEAR_BY_SLOT = {
  Tank: [["tank_1", "Rental Tank"], ["tank_2", "Aluminum Tank"], ["tank_3", "Steel Tank"], ["tank_4", "Twin Tanks"], ["tank_5", "Carbon Tank"], ["tank_6", "Rebreather"], ["tank_7", "Abyss Rebreather"], ["tank_8", "Atlantean Gill Core"]],
  Fins: [["fins_1", "Flippers"], ["fins_2", "Split Fins"], ["fins_3", "Jet Fins"], ["fins_4", "Freediver Fins"], ["fins_5", "Carbon Blades"], ["fins_6", "Monofin"], ["fins_7", "Thruster Fins"], ["fins_8", "Poseidon's Fins"]],
  Backpack: [["bag_1", "Mesh Pouch"], ["bag_2", "Dive Bag"], ["bag_3", "Treasure Sack"], ["bag_4", "Salvage Pack"], ["bag_5", "Expedition Pack"], ["bag_6", "Cargo Rig"], ["bag_7", "Abyssal Hauler"], ["bag_8", "Leviathan Vault"]],
  Suit: [["suit_1", "Board Shorts"], ["suit_2", "Wetsuit"], ["suit_3", "Drysuit"], ["suit_4", "Pressure Suit"], ["suit_5", "Atmospheric Suit"], ["suit_6", "Atlantean Armor"]],
  Tool: [["tool_1", "Bare Hands"], ["tool_2", "Dive Gloves"], ["tool_3", "Grabber"], ["tool_4", "Salvage Claw"], ["tool_5", "Vacuum Collector"], ["tool_6", "Tidecaller Gauntlet"]],
} as const

export const VESSELS = [
  { id: "dinghy", name: "Dinghy", kind: "boat", rarity: "Starter", bonus: "No bonus" },
  { id: "fishing_boat", name: "Fishing Boat", kind: "boat", rarity: "Common", bonus: "+5% sell cash" },
  { id: "harbor_skiff", name: "Harbor Skiff", kind: "boat", rarity: "Common", bonus: "+6% sell cash" },
  { id: "duck_boat", name: "Rubber Duck", kind: "boat", rarity: "Common", bonus: "+5% sell cash" },
  { id: "research_vessel", name: "Research Vessel", kind: "boat", rarity: "Uncommon", bonus: "+10% sell cash" },
  { id: "harbor_tug", name: "Harbor Tug", kind: "boat", rarity: "Uncommon", bonus: "+12% sell cash" },
  { id: "speedboat", name: "Speedboat", kind: "boat", rarity: "Uncommon", bonus: "+11% sell cash" },
  { id: "salvage_ship", name: "Salvage Ship", kind: "boat", rarity: "Rare", bonus: "+20% sell cash" },
  { id: "catamaran", name: "Catamaran", kind: "boat", rarity: "Rare", bonus: "+22% sell cash" },
  { id: "viking_longship", name: "Viking Longship", kind: "boat", rarity: "Rare", bonus: "+24% sell cash" },
  { id: "luxury_yacht", name: "Luxury Yacht", kind: "boat", rarity: "Epic", bonus: "+35% sell cash" },
  { id: "pirate_galleon", name: "Pirate Galleon", kind: "boat", rarity: "Epic", bonus: "+40% sell cash" },
  { id: "pearl_clipper", name: "Pearl Clipper", kind: "boat", rarity: "Legendary", bonus: "+50% sell cash" },
  { id: "ice_breaker", name: "Icebreaker", kind: "boat", rarity: "Legendary", bonus: "+55% sell cash" },
  { id: "atlantean_barge", name: "Atlantean Barge", kind: "boat", rarity: "Mythical", bonus: "+75% sell cash" },
  { id: "ghost_ship", name: "Ghost Ship", kind: "boat", rarity: "Mythical", bonus: "+85% sell cash" },
  { id: "tin_sub", name: "Tin Sub", kind: "sub", rarity: "Starter", bonus: "No luck bonus · 40-stud sonar" },
  { id: "bubble_sub", name: "Bubble Sub", kind: "sub", rarity: "Common", bonus: "+8% luck · 56-stud sonar" },
  { id: "explorer_sub", name: "Explorer Sub", kind: "sub", rarity: "Common", bonus: "+10% luck · 60-stud sonar" },
  { id: "turtle_sub", name: "Turtle Sub", kind: "sub", rarity: "Common", bonus: "+7% luck · 54-stud sonar" },
  { id: "deep_rover", name: "Deep Rover", kind: "sub", rarity: "Uncommon", bonus: "+20% luck · 85-stud sonar" },
  { id: "lantern_sub", name: "Lanternfish Sub", kind: "sub", rarity: "Uncommon", bonus: "+22% luck · 80-stud sonar" },
  { id: "shark_sub", name: "Shark Sub", kind: "sub", rarity: "Uncommon", bonus: "+21% luck · 82-stud sonar" },
  { id: "manta_sub", name: "Manta Sub", kind: "sub", rarity: "Rare", bonus: "+40% luck · 120-stud sonar" },
  { id: "jelly_sub", name: "Jellyfish Sub", kind: "sub", rarity: "Rare", bonus: "+38% luck · 110-stud sonar" },
  { id: "nautilus", name: "Nautilus", kind: "sub", rarity: "Epic", bonus: "+70% luck · 170-stud sonar" },
  { id: "whale_sub", name: "Whale Sub", kind: "sub", rarity: "Epic", bonus: "+75% luck · 185-stud sonar" },
  { id: "kraken_sub", name: "Kraken Sub", kind: "sub", rarity: "Legendary", bonus: "+110% luck · 230-stud sonar" },
  { id: "treasure_sub", name: "Treasure Sub", kind: "sub", rarity: "Legendary", bonus: "+120% luck · 215-stud sonar" },
  { id: "pearl_sub", name: "Poseidon's Pearl", kind: "sub", rarity: "Mythical", bonus: "+180% luck · 320-stud sonar" },
  { id: "phantom_sub", name: "Phantom Sub", kind: "sub", rarity: "Mythical", bonus: "+200% luck · 340-stud sonar" },
] as const

export const VESSELS_BY_KIND = {
  boat: VESSELS.filter((vessel) => vessel.kind === "boat"),
  sub: VESSELS.filter((vessel) => vessel.kind === "sub"),
}
export const VESSEL_BY_ID = Object.fromEntries(VESSELS.map((vessel) => [vessel.id, vessel])) as Record<string, (typeof VESSELS)[number]>
export const VESSEL_IDS = new Set<string>(VESSELS.map((vessel) => vessel.id))
export const STARTER_VESSEL_IDS = new Set(["dinghy", "tin_sub"])
export const LEGACY_VESSEL_GEAR_IDS = new Set(["scan_1", "scan_2", "scan_3", "scan_4", "scan_5", "scan_6", "scan_7", "scan_8", "boat_1", "boat_2", "boat_3", "boat_4", "boat_5", "sub_1", "sub_2", "sub_3", "sub_4", "sub_5"])

export const VESSEL_ROLL_ODDS = [
  { rarity: "Common", chance: "55%" },
  { rarity: "Uncommon", chance: "28%" },
  { rarity: "Rare", chance: "11%" },
  { rarity: "Epic", chance: "4.5%" },
  { rarity: "Legendary", chance: "1.2%" },
  { rarity: "Mythical", chance: "0.3%" },
] as const
export const VESSEL_EPIC_PITY_ROLLS = 30

export const GAME_PASSES = [
  { key: "ClamMaster", id: 0, availability: "Coming soon", description: "Roll 5 clams at once; Rare-or-better boats and subs are 50% more likely. Clams are never sold for Robux." },
] as const

export const FINDS_BY_ISLAND = {
  reef: [["pink_scallop", "Pink Scallop"], ["spiral_conch", "Spiral Conch"], ["orange_starfish", "Orange Starfish"], ["sunny_scallop", "Sunny Scallop"], ["clownfish", "Clownfish"], ["blue_tang", "Blue Tang"], ["sea_glass", "Sea Glass Bottle"], ["tiger_conch", "Tiger Conch"], ["white_pearl", "White Pearl"], ["moon_jelly", "Moon Jelly"], ["lost_doubloons", "Lost Doubloons"], ["coral_heart", "Coral Heart"], ["reef_chest", "Reef Chest"], ["golden_starfish", "Golden Starfish"], ["eagle_ray", "Spotted Eagle Ray"], ["lagoon_pearl", "Pearl of the Lagoon"], ["message_bottle", "Message from the Deep"]],
  wreck: [["rusty_anchor", "Rusty Anchor"], ["barnacle_bottle", "Barnacle Bottle"], ["copper_coins", "Copper Coins"], ["wreck_grouper", "Wreck Grouper"], ["brass_compass", "Brass Compass"], ["cargo_amphora", "Cargo Amphora"], ["pufferfish", "Pufferfish"], ["black_pearl", "Black Pearl"], ["pirate_chest", "Pirate Chest"], ["divers_helmet", "Diver's Helmet"], ["gilded_goblet", "Gilded Goblet"], ["ghost_jelly", "Ghost Jelly"], ["captains_crown", "Captain's Crown"], ["cursed_doubloons", "Cursed Doubloons"], ["krakens_compass", "Kraken's Compass"]],
  caverns: [["quartz_shard", "Quartz Shard"], ["amethyst", "Amethyst Cluster"], ["cave_conch", "Cave Conch"], ["cavefish", "Blind Cavefish"], ["glow_starfish", "Glow Starfish"], ["topaz", "Topaz"], ["sapphire", "Sapphire"], ["lantern_jelly", "Lantern Jelly"], ["geode_orb", "Geode Orb"], ["emerald", "Emerald"], ["crystal_pearl", "Crystal Pearl"], ["cavern_idol", "Cavern Idol"], ["cavern_heart", "Heart of the Cavern"], ["prism_shard", "Prism Shard"]],
  deep: [["deep_scallop", "Deep Scallop"], ["lanternfish", "Lanternfish"], ["sunken_amphora", "Sunken Amphora"], ["hatchetfish", "Hatchetfish"], ["giant_clam", "Giant Clam"], ["steel_anchor", "Steel Anchor"], ["manta", "Oceanic Manta"], ["gold_compass", "Navigator's Compass"], ["royal_goblet", "Royal Goblet"], ["blue_shark", "Blue Shark"], ["sapphire_crown", "Sapphire Crown"], ["abyss_locker", "Abyss Locker"], ["leviathan_scale", "Leviathan Scale"]],
  trench: [["lanternjaw", "Lanternjaw"], ["obsidian", "Obsidian Shard"], ["ghost_shell", "Ghost Shell"], ["bone_star", "Bone Starfish"], ["thermal_pearl", "Thermal Pearl"], ["vent_crystal", "Vent Crystal"], ["abyss_jelly", "Abyss Jelly"], ["research_probe", "Lost Research Probe"], ["gulper", "Abyssal Gulper"], ["void_gem", "Void Gem"], ["trench_idol", "Trench Idol"], ["phantom_shark", "Phantom Shark"], ["abyssal_eye", "The Abyssal Eye"]],
  atlantis: [["atlantean_coins", "Atlantean Coins"], ["rune_tablet", "Rune Tablet"], ["orichalcum", "Orichalcum Shard"], ["temple_amphora", "Temple Amphora"], ["tide_pearl", "Tide Pearl"], ["oracle_orb", "Oracle Orb"], ["atlantean_helm", "Atlantean Helm"], ["sacred_goblet", "Sacred Goblet"], ["guardian_tablet", "Guardian Tablet"], ["poseidons_trident", "Poseidon's Trident"], ["crown_of_atlantis", "Crown of Atlantis"], ["golden_manta", "Golden Manta"], ["guardian_idol", "Guardian Idol"], ["heart_of_atlantis", "Heart of Atlantis"]],
  aurora_reach: [],
} as const

export const VARIANTS = ["Golden", "Crystal", "Ancient", "Glowing", "Shiny", "Prismatic"] as const
export const SECRET_SITES = [
  { id: "strongroom", name: "Captain's Strongroom" },
  { id: "forge", name: "Magma Forge" },
  { id: "whaleroad", name: "The Whale Road" },
  { id: "sanctum", name: "Sealed Sanctum" },
] as const

export const ISLAND_LABELS = Object.fromEntries(ISLANDS.map((island) => [island.id, island.name])) as Record<string, string>
export const EVENT_LABELS = Object.fromEntries(GAME_EVENTS.map((event) => [event.id, event.name])) as Record<string, string>
export const ISLAND_IDS = new Set<string>(ISLANDS.map((island) => island.id))
export const EVENT_IDS = new Set<string>(GAME_EVENTS.map((event) => event.id))
export const GEAR_IDS = new Set<string>(Object.values(GEAR_BY_SLOT).flatMap((items) => items.map(([id]) => id)))
export const FIND_IDS = new Set<string>(Object.values(FINDS_BY_ISLAND).flatMap((items) => items.map(([id]) => id)))
export const BREW_IDS = new Set<string>(BREWS.map((brew) => brew.id))
