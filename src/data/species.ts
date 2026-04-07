import type { SpeciesData, CharacteristicKey } from '../types/character';

export const SPECIES_DATA: Record<string, SpeciesData> = {
  "Human / Reiklander": {
    chars: { WS: 20, BS: 20, S: 20, T: 20, I: 20, Ag: 20, Dex: 20, Int: 20, WP: 20, Fel: 20 } as Record<CharacteristicKey, number>,
    move: 4,
    fate: 2,
    resilience: 1,
    extraPoints: 3,
    woundsUseSB: false,
    skills: ["Animal Care", "Charm", "Cool", "Evaluate", "Gossip", "Haggle", "Language (Bretonnian)", "Language (Wastelander)", "Leadership", "Lore (Reikland)", "Melee (Basic)", "Ranged (Bow)"],
    talents: ["Doomed", "Savvy or Suave"],
  },
  "Dwarf": {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 } as Record<CharacteristicKey, number>,
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write", "Resolute or Strong-minded"],
  },
  "Halfling": {
    chars: { WS: 10, BS: 30, S: 10, T: 20, I: 20, Ag: 20, Dex: 30, Int: 20, WP: 30, Fel: 30 } as Record<CharacteristicKey, number>,
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 3,
    woundsUseSB: false,
    skills: ["Charm", "Consume Alcohol", "Dodge", "Gamble", "Gossip", "Haggle", "Intuition", "Language (Mootish)", "Lore (Reikland)", "Perception", "Sleight of Hand", "Stealth (Any)"],
    talents: ["Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small"],
  },
  "High Elf": {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 } as Record<CharacteristicKey, number>,
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: false,
    skills: ["Cool", "Entertain (Sing)", "Evaluate", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)", "Research", "Sail"],
    talents: ["Acute Sense (Sight)", "Coolheaded or Savvy", "Night Vision", "Read/Write", "Second Sight or Sixth Sense"],
  },
  "Wood Elf": {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 } as Record<CharacteristicKey, number>,
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: false,
    skills: ["Athletics", "Climb", "Endurance", "Entertain (Sing)", "Intimidate", "Language (Eltharin)", "Melee (Basic)", "Outdoor Survival", "Perception", "Ranged (Bow)", "Stealth (Rural)", "Track"],
    talents: ["Acute Sense (Sight)", "Hardy or Second Sight", "Night Vision", "Read/Write", "Rover or Strider (Woodlands)"],
  },
};

export const SPECIES_OPTIONS = Object.keys(SPECIES_DATA);
