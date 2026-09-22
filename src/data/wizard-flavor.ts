/**
 * Descriptive flavour text shown in the character-creation wizard for each
 * species and class. Presentation copy only (no game mechanics); extracted
 * from CharacterWizard so the component file stays focused on wizard logic.
 */

export const SPECIES_FLAVOR: Record<string, string> = {
  'Human / Reiklander': 'Humans are the most numerous and diverse of the civilised races. Reiklanders hail from the heart of the Empire, a land of rolling hills, dark forests, and bustling cities. Ambitious and adaptable, they are found in every walk of life.',
  'Dwarf': 'Dwarfs are a proud, ancient race of master craftsmen and fierce warriors. Stubborn and honourable, they hold grudges for generations and value gold, ale, and the bonds of kinship above all else.',
  'Halfling': 'Halflings are a small, cheerful folk known for their love of good food, fine pipe-weed, and comfortable living. Do not be fooled by their stature — they are surprisingly resilient and remarkably lucky.',
  'High Elf': 'High Elves are the eldest of the civilised races, hailing from the island continent of Ulthuan. Graceful, long-lived, and possessed of keen senses, they view the younger races with a mixture of pity and disdain.',
  'High Elves (Caledor)': 'Caledor was once the mightiest of Ulthuan\'s kingdoms, home to Dragon riders and proud warriors. Though the Dragons now slumber, Caledorians remain haughty and martial, ever seeking to restore their kingdom\'s former glory.',
  'High Elves (Ellyrion)': 'Ellyrion is a land of open plains and swift horses. Its people are renowned riders and breeders of steeds, with a deep bond to their animals and a love of freedom and the open sky.',
  'High Elves (Avelorn)': 'Avelorn is the spiritual heart of Ulthuan, a pastoral paradise ruled by the Everqueen. Its folk are whimsical and artistic, drawn to beauty and nature, yet fierce in defence of their idyllic homeland.',
  'High Elves (Saphery)': 'Saphery is the realm of mages and scholars, home to the White Tower of Hoeth. Its people prize knowledge above all else, and even the lowliest Sapherian values learning and arcane lore.',
  'High Elves (Eataine)': 'Eataine is the seat of the Phoenix King and home to the great city of Lothern. Its people are cosmopolitan traders, diplomats, and explorers, inspired by commerce and the wider world.',
  'High Elves (Tiranoc)': 'Tiranoc was devastated during the Sundering but its people endure. They are resilient charioteers and horsemasters who remember their kingdom\'s lost glory and harbour deep hatred for the Dark Elves.',
  'High Elves (Nagarythe)': 'The Shadowlands of Nagarythe breed restless, driven Elves consumed by the need to thwart the Druchii. They are stealthy scouts and relentless warriors, rarely welcomed elsewhere in Ulthuan.',
  'High Elves (Chrace)': 'Chrace is a rugged, forested kingdom whose people are hardy hunters and woodsmen. The legendary White Lions of Chrace serve as the Phoenix King\'s bodyguard, embodying their homeland\'s strength.',
  'High Elves (Cothique)': 'Cothique is a maritime kingdom of bold sailors and explorers. Its people are drawn to fresh horizons, seeking discovery, trade, and the sheer exhilaration of the open sea.',
  'High Elves (Yvresse)': 'Since Grom\'s invasion, Yvresse\'s subjects are resolute and dour, with a disarming tendency to blunt manners. Under Eltharion the Grim, they are expert Daemon-hunters who always hold the line.',
  'High Elves (Sea Elf)': 'Sea Elves are High Elves who dwell in trading enclaves abroad or spend their lives at sea. Cosmopolitan and worldly, they are looked down upon by Ulthuan\'s more conventional Asur.',
  'Wood Elf': 'Wood Elves dwell in the ancient forest of Athel Loren, living in harmony with nature. Wild and fierce, they are deadly archers and silent hunters who guard their woodland realm with lethal determination.',
};

export const CLASS_FLAVOR: Record<string, string> = {
  Academics: 'Scholars, physicians, and learned folk who pursue knowledge and the arcane arts.',
  Burghers: 'Merchants, artisans, and townsfolk who form the backbone of the Empire\'s economy.',
  Courtiers: 'Nobles, diplomats, and those who navigate the treacherous waters of Imperial politics.',
  Peasants: 'The common folk — farmers, labourers, and humble servants of the land.',
  Rangers: 'Wanderers, scouts, and those who make their living in the wild places of the Old World.',
  Riverfolk: 'Boatmen, fishermen, and all who ply their trade upon the Empire\'s great rivers.',
  Rogues: 'Thieves, charlatans, and those who live outside the law — or at least bend it considerably.',
  Warriors: 'Soldiers, knights, and fighters who live and die by the sword.',
};
