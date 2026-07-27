/**
 * Ritual data from Winds of Magic supplement.
 * Rituals are powerful spells requiring ingredients, conditions, and extended channelling.
 */

export interface RitualData {
  name: string;
  cn: number;
  type: string;
  learningXP: number;
  ingredients: string;
  conditions: string;
  description: string;
}

export const RITUAL_LIST: RitualData[] = [
  {
    name: "Bind Monstrous Beast",
    cn: 0, // Equal to the Beast's Wounds
    type: "Lore of Beasts",
    learningXP: 400,
    ingredients: "The skull or hide from the same species as the beast being bound.",
    conditions: "The inhabited lair of a suitable beast must be within Willpower yards of the caster.",
    description: "Project your will onto a target beast. Win an Opposed Willpower Test to control it for WP Bonus days. The beast follows clear orders during this time.",
  },
  {
    name: "Bind Spirit Within Power Stone",
    cn: 32,
    type: "Any Lore of the Eight Winds",
    learningXP: 600,
    ingredients: "None, but a Power Stone and a Minor Elemental (or similar spirit) are required.",
    conditions: "If performed at a Leyline Junction or Arcane Fulcrum, the CN is halved.",
    description: "Bind a minor spirit within a Power Stone. The inhabited Power Stone grants benefits as described for Power Stones with bound spirits.",
  },
  {
    name: "Carve Ogham Stone",
    cn: 50,
    type: "Any",
    learningXP: 450,
    ingredients: "A large piece of granite shot through with veins of quartz, around six feet in height and a foot in breadth.",
    conditions: "Inscribe the stone with magical symbols. Requires Read/Write Talent, a Difficult (-10) Language (Magick) Test and an Average (+20) Art (Engraving) Test.",
    description: "Create an Ogham stone with one waystone property: Attraction, Containment, or Dampening. Can be constructed into a druidic circle.",
  },
  {
    name: "Create Power Stone",
    cn: 64,
    type: "Any Lore of the Eight Winds",
    learningXP: 400,
    ingredients: "None.",
    conditions: "At least two apprentices must assist. If performed at a Leyline Junction or Arcane Fulcrum, the CN is halved.",
    description: "Create one Power Stone of a type corresponding to your Lore of Magic. Taught only to select master wizards and wizard lords.",
  },
  {
    name: "Conjuration of the Bloody Hidesman",
    cn: 85,
    type: "Lore of Beasts",
    learningXP: 500,
    ingredients: "A constructed totem comprised of the bones and freshly flensed pelts from eight or more large animals.",
    conditions: "Extreme Saturation, an Arcane Fulcrum, or a Storm of Magic.",
    description: "Summon an Incarnate Elemental of Beasts. Must win an Opposed Willpower/Strength Test to control it. Lives for WP Bonus days.",
  },
  {
    name: "Conjuration of the Incarnate Elemental of Death",
    cn: 90,
    type: "Lore of Death",
    learningXP: 500,
    ingredients: "An hourglass filled with sand made from the powdered bones of a monarch (becomes part of the Elemental).",
    conditions: "Extreme Saturation, an Arcane Fulcrum, or a Storm of Magic.",
    description: "Summon a twin-headed serpentine Incarnate Elemental of Death. Must win an Opposed Willpower/Strength Test to control it. Lives for WP Bonus days.",
  },
  {
    name: "Conjuration of Jack o' Cinders",
    cn: 85,
    type: "Lore of Fire",
    learningXP: 500,
    ingredients: "A colossal pyre must be constructed and kept ablaze whilst the ritual is in progress.",
    conditions: "Extreme Saturation, an Arcane Fulcrum, or a Storm of Magic.",
    description: "Summon an Incarnate Elemental of Fire from the inferno. Must win an Opposed Willpower/Strength Test to control it. Lives for WP Bonus days.",
  },
  {
    name: "Create Construct",
    cn: 60,
    type: "Any Lore",
    learningXP: 400,
    ingredients: "A suitable form for the construct to inhabit (metal automaton, puppet, organic matter, empty suit of armour, etc.).",
    conditions: "No conditions necessary.",
    description: "Animate a construct with a default profile. Additional Creature Traits can be added by increasing the CN. The construct follows your orders.",
  },
  {
    name: "Create Familiar",
    cn: 45,
    type: "Any Lore",
    learningXP: 250,
    ingredients: "A suitable vessel (marionette, pet cat, small skeleton, grimoire, etc.).",
    conditions: "No conditions necessary. Sacrifice: permanently surrender a Wound, Fate point, or Resilience point.",
    description: "Imbue a vessel with your essence and magical power to create a familiar: Power (assists spellcasting), Spell (a wizard in its own right), or Combat (magical bodyguard).",
  },
  {
    name: "Imbue Staff",
    cn: 35,
    type: "Any Lore of the Eight Winds",
    learningXP: 100,
    ingredients: "A quarterstaff or metal rod of similar length, plus paraphernalia and decorations relating to the caster's Lore.",
    conditions: "No conditions necessary. Sacrifice: a Fortune or Resolve point.",
    description: "Imbue the staff with magical symbology and power, creating an Enchanted Staff.",
  },
  {
    name: "Materialise the Living Swamp",
    cn: 40,
    type: "Lore of Death, Lore of Life, Lore of Shadows, Lore of Hedgecraft, Lore of Witchcraft",
    learningXP: 400,
    ingredients: "A heartstone and access to a quantity of organic matter.",
    conditions: "Heavy, Extreme, or Corrupted Saturation, an Arcane Fulcrum, or a Storm of Magic.",
    description: "Marsh matter and vegetation coalesce into a Fenbeast. Lives for WP Bonus days (extended in Extreme Saturation). Follows your orders and can be dismissed at any time.",
  },
  {
    name: "Remove Curse",
    cn: 40,
    type: "Any Lore",
    learningXP: 200,
    ingredients: "The cursed item (must be confirmed cursed via Decipher Curse spell).",
    conditions: "The item must be confirmed as cursed through a successful Decipher Curse spell.",
    description: "Lift the curse, removing all boons and banes from the item. A weapon whose curse is lifted retains its Magical Quality.",
  },
  {
    name: "Cursecraft",
    cn: 50,
    type: "Any Lore (reduced CN 25 for Witchcraft, Daemonology, Necromancy, or Chaos Lores)",
    learningXP: 200,
    ingredients: "None, though access to the item to be cursed is required.",
    conditions: "No conditions necessary. Sacrifice: permanently lose 1 Wound and suffer Moderate Exposure to Corruption.",
    description: "Imbue an item with a magical boon that also comes with a deliberate ironic or dangerous bane (curse). The nature of both is decided by player and GM.",
  },
];
