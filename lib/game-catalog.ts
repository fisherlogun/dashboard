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
] as const

export const BREWS = [
  { id: "luck", name: "Lucky Kelp Brew" },
  { id: "air", name: "Deep Breath Tonic" },
  { id: "swift", name: "Swift Fin Draught" },
  { id: "sonar", name: "Sonar Sight Elixir" },
  { id: "haggle", name: "Merchant's Honey" },
] as const

export const GEAR_BY_SLOT = {
  Tank: [["tank_1", "Rental Tank"], ["tank_2", "Aluminum Tank"], ["tank_3", "Steel Tank"], ["tank_4", "Twin Tanks"], ["tank_5", "Carbon Tank"], ["tank_6", "Rebreather"], ["tank_7", "Abyss Rebreather"], ["tank_8", "Atlantean Gill Core"]],
  Fins: [["fins_1", "Flippers"], ["fins_2", "Split Fins"], ["fins_3", "Jet Fins"], ["fins_4", "Freediver Fins"], ["fins_5", "Carbon Blades"], ["fins_6", "Monofin"], ["fins_7", "Thruster Fins"], ["fins_8", "Poseidon's Fins"]],
  Backpack: [["bag_1", "Mesh Pouch"], ["bag_2", "Dive Bag"], ["bag_3", "Treasure Sack"], ["bag_4", "Salvage Pack"], ["bag_5", "Expedition Pack"], ["bag_6", "Cargo Rig"], ["bag_7", "Abyssal Hauler"], ["bag_8", "Leviathan Vault"]],
  Scanner: [["scan_1", "Handheld Sonar"], ["scan_2", "Fish Finder"], ["scan_3", "Metal Detector"], ["scan_4", "Deep Sonar"], ["scan_5", "Resonance Scanner"], ["scan_6", "Quantum Scanner"], ["scan_7", "Abyss Eye"], ["scan_8", "Oracle Lens"]],
  Suit: [["suit_1", "Board Shorts"], ["suit_2", "Wetsuit"], ["suit_3", "Drysuit"], ["suit_4", "Pressure Suit"], ["suit_5", "Atmospheric Suit"], ["suit_6", "Atlantean Armor"]],
  Tool: [["tool_1", "Bare Hands"], ["tool_2", "Dive Gloves"], ["tool_3", "Grabber"], ["tool_4", "Salvage Claw"], ["tool_5", "Vacuum Collector"], ["tool_6", "Tidecaller Gauntlet"]],
  Boat: [["boat_1", "Dinghy"], ["boat_2", "Fishing Boat"], ["boat_3", "Research Vessel"], ["boat_4", "Salvage Ship"], ["boat_5", "Luxury Yacht"]],
  Sub: [["sub_1", "No Submarine"], ["sub_2", "Mini Sub"], ["sub_3", "Explorer Sub"], ["sub_4", "Deep Rover"], ["sub_5", "Nautilus"]],
} as const

export const FINDS_BY_ISLAND = {
  reef: [["pink_scallop", "Pink Scallop"], ["spiral_conch", "Spiral Conch"], ["orange_starfish", "Orange Starfish"], ["sunny_scallop", "Sunny Scallop"], ["clownfish", "Clownfish"], ["blue_tang", "Blue Tang"], ["sea_glass", "Sea Glass Bottle"], ["tiger_conch", "Tiger Conch"], ["white_pearl", "White Pearl"], ["moon_jelly", "Moon Jelly"], ["lost_doubloons", "Lost Doubloons"], ["coral_heart", "Coral Heart"], ["reef_chest", "Reef Chest"], ["golden_starfish", "Golden Starfish"], ["eagle_ray", "Spotted Eagle Ray"], ["lagoon_pearl", "Pearl of the Lagoon"], ["message_bottle", "Message from the Deep"]],
  wreck: [["rusty_anchor", "Rusty Anchor"], ["barnacle_bottle", "Barnacle Bottle"], ["copper_coins", "Copper Coins"], ["wreck_grouper", "Wreck Grouper"], ["brass_compass", "Brass Compass"], ["cargo_amphora", "Cargo Amphora"], ["pufferfish", "Pufferfish"], ["black_pearl", "Black Pearl"], ["pirate_chest", "Pirate Chest"], ["divers_helmet", "Diver's Helmet"], ["gilded_goblet", "Gilded Goblet"], ["ghost_jelly", "Ghost Jelly"], ["captains_crown", "Captain's Crown"], ["cursed_doubloons", "Cursed Doubloons"], ["krakens_compass", "Kraken's Compass"]],
  caverns: [["quartz_shard", "Quartz Shard"], ["amethyst", "Amethyst Cluster"], ["cave_conch", "Cave Conch"], ["cavefish", "Blind Cavefish"], ["glow_starfish", "Glow Starfish"], ["topaz", "Topaz"], ["sapphire", "Sapphire"], ["lantern_jelly", "Lantern Jelly"], ["geode_orb", "Geode Orb"], ["emerald", "Emerald"], ["crystal_pearl", "Crystal Pearl"], ["cavern_idol", "Cavern Idol"], ["cavern_heart", "Heart of the Cavern"], ["prism_shard", "Prism Shard"]],
  deep: [["deep_scallop", "Deep Scallop"], ["lanternfish", "Lanternfish"], ["sunken_amphora", "Sunken Amphora"], ["hatchetfish", "Hatchetfish"], ["giant_clam", "Giant Clam"], ["steel_anchor", "Steel Anchor"], ["manta", "Oceanic Manta"], ["gold_compass", "Navigator's Compass"], ["royal_goblet", "Royal Goblet"], ["blue_shark", "Blue Shark"], ["sapphire_crown", "Sapphire Crown"], ["abyss_locker", "Abyss Locker"], ["leviathan_scale", "Leviathan Scale"]],
  trench: [["lanternjaw", "Lanternjaw"], ["obsidian", "Obsidian Shard"], ["ghost_shell", "Ghost Shell"], ["bone_star", "Bone Starfish"], ["thermal_pearl", "Thermal Pearl"], ["vent_crystal", "Vent Crystal"], ["abyss_jelly", "Abyss Jelly"], ["research_probe", "Lost Research Probe"], ["gulper", "Abyssal Gulper"], ["void_gem", "Void Gem"], ["trench_idol", "Trench Idol"], ["phantom_shark", "Phantom Shark"], ["abyssal_eye", "The Abyssal Eye"]],
  atlantis: [["atlantean_coins", "Atlantean Coins"], ["rune_tablet", "Rune Tablet"], ["orichalcum", "Orichalcum Shard"], ["temple_amphora", "Temple Amphora"], ["tide_pearl", "Tide Pearl"], ["oracle_orb", "Oracle Orb"], ["atlantean_helm", "Atlantean Helm"], ["sacred_goblet", "Sacred Goblet"], ["guardian_tablet", "Guardian Tablet"], ["poseidons_trident", "Poseidon's Trident"], ["crown_of_atlantis", "Crown of Atlantis"], ["golden_manta", "Golden Manta"], ["guardian_idol", "Guardian Idol"], ["heart_of_atlantis", "Heart of Atlantis"]],
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
