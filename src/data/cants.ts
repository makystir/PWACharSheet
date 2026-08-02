/**
 * Static catalogue of Alternative Channelling Cants
 * from Archives of the Empire Volume III, Chapter VIII.
 *
 * Each of the 8 Winds of Magic has exactly 3 Cants
 * costing 1, 2, and 3 SL respectively (24 total).
 */

/** All 8 colour magic Lore strings */
export const COLOUR_LORES = [
  "Lore of Beasts",
  "Lore of Death",
  "Lore of Fire",
  "Lore of Heavens",
  "Lore of Life",
  "Lore of Light",
  "Lore of Metal",
  "Lore of Shadows",
] as const;

/** Union type of all colour magic Lore strings */
export type ColourLore = (typeof COLOUR_LORES)[number];

/** A single Cant entry in the static catalogue */
export interface CantEntry {
  /** Unique identifier, e.g. "beasts-face-of-the-wild" */
  id: string;
  /** The colour magic Lore this Cant belongs to */
  lore: ColourLore;
  /** Display name of the Cant */
  name: string;
  /** SL cost to activate (1, 2, or 3) */
  slCost: number;
  /** Mechanical effect description */
  effect: string;
  /** If true, the user can spend between slCost and WP Bonus SL */
  variableSL?: boolean;
}

/** Display names for each Wind, mapping Lore string to short form with Wind name */
export const WIND_DISPLAY_NAMES: Record<ColourLore, string> = {
  "Lore of Beasts": "Beasts (Ghur)",
  "Lore of Death": "Death (Shyish)",
  "Lore of Fire": "Fire (Aqshy)",
  "Lore of Heavens": "Heavens (Azyr)",
  "Lore of Life": "Life (Ghyran)",
  "Lore of Light": "Light (Hysh)",
  "Lore of Metal": "Metal (Chamon)",
  "Lore of Shadows": "Shadows (Ulgu)",
};

/** Complete catalogue of all 24 Alternative Channelling Cants */
export const CANT_CATALOGUE: readonly CantEntry[] = [
  // ─── Lore of Beasts (Ghur) ────────────────────────────────────────
  {
    id: "beasts-face-of-the-wild",
    lore: "Lore of Beasts",
    name: "Face of the Wild",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to sprout fangs, fur, claws, or other intimidating features. Gain the Fear (1) Creature Trait until your next turn.",
  },
  {
    id: "beasts-talons-of-ghur",
    lore: "Lore of Beasts",
    name: "Talons of Ghur",
    slCost: 2,
    effect:
      "Expend SL of gathered power (up to your Willpower Bonus) to add +1 Damage per SL to any unarmed attack until your next turn. May apply after rolling but before results are described.",
    variableSL: true,
  },
  {
    id: "beasts-thick-hide",
    lore: "Lore of Beasts",
    name: "Thick Hide",
    slCost: 3,
    effect:
      "Expend 3 SL of gathered power to reinforce leather armour you are wearing. Add 1 AP to any hit location protected by leather armour until your next turn.",
  },

  // ─── Lore of Death (Shyish) ───────────────────────────────────────
  {
    id: "death-eyes-of-death",
    lore: "Lore of Death",
    name: "Eyes of Death",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to receive a vision of another creature's death. Ask how close a visible creature is to death; the GM describes in relative terms how many Wounds it has remaining.",
  },
  {
    id: "death-whispers-of-doom",
    lore: "Lore of Death",
    name: "Whispers of Doom",
    slCost: 2,
    effect:
      "Expend 2 SL of gathered power to learn the Dooming of any creature you inflicted at least 1 Wound on during the previous Willpower Bonus minutes.",
  },
  {
    id: "death-deaths-visage",
    lore: "Lore of Death",
    name: "Death's Visage",
    slCost: 3,
    effect:
      "Expend 3 SL of gathered power to take on the aspect of the grave. For this round, you no longer need to breathe and can ignore the effects of Fatigued, disease, and Poisoned. Undead ignore you unless you attack them or they are intelligent enough to see through the ruse.",
  },

  // ─── Lore of Fire (Aqshy) ────────────────────────────────────────
  {
    id: "fire-brighten-blaze",
    lore: "Lore of Fire",
    name: "Brighten Blaze",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to intensify any non-magical fire you can see within Willpower yards. Increases illumination and may inflict an Ablaze Condition on nearby creatures at GM discretion.",
  },
  {
    id: "fire-set-alight",
    lore: "Lore of Fire",
    name: "Set Alight",
    slCost: 2,
    effect:
      "When you strike an opponent with a Melee attack, expend 2 SL of gathered power to inflict one Ablaze Condition upon them.",
  },
  {
    id: "fire-fervent-bellow",
    lore: "Lore of Fire",
    name: "Fervent Bellow",
    slCost: 3,
    effect:
      "Shout your encouragement and expend 3 SL of gathered power to remove one Broken Condition from one ally who can hear your voice.",
  },

  // ─── Lore of Heavens (Azyr) ──────────────────────────────────────
  {
    id: "heavens-visions-of-trauma",
    lore: "Lore of Heavens",
    name: "Visions of Trauma",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to gain +1 SL on any Dodge or Melee Test you make to avoid or parry an attack.",
  },
  {
    id: "heavens-crackling-blade",
    lore: "Lore of Heavens",
    name: "Crackling Blade",
    slCost: 2,
    effect:
      "Expend SL of gathered power (up to your Willpower Bonus) to add +1 Damage per SL to any Melee attack with a metal weapon. May apply after rolling but before results are described.",
    variableSL: true,
  },
  {
    id: "heavens-visions-of-fortune",
    lore: "Lore of Heavens",
    name: "Visions of Fortune",
    slCost: 3,
    effect:
      "Expend 3 SL of gathered power to peer into the future and shout a warning to an ally who can hear you. They receive +2 SL to use on any one Test during their next turn. You may not use this Cant on yourself.",
  },

  // ─── Lore of Life (Ghyran) ───────────────────────────────────────
  {
    id: "life-staunch",
    lore: "Lore of Life",
    name: "Staunch",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to remove all Fatigued and Bleeding Conditions from yourself.",
  },
  {
    id: "life-invigorate",
    lore: "Lore of Life",
    name: "Invigorate",
    slCost: 2,
    effect:
      "As an Action, expend 2 SL of gathered power and touch another creature. Until your next turn, that creature gains +1 SL to all Strength or Toughness Tests, and automatically passes any Test to resist disease or poison.",
  },
  {
    id: "life-regenerate",
    lore: "Lore of Life",
    name: "Regenerate",
    slCost: 3,
    effect:
      "At the start of your turn, expend 3 SL of gathered power to immediately gain the Regenerate Creature Trait until the start of the next Round.",
  },

  // ─── Lore of Light (Hysh) ────────────────────────────────────────
  {
    id: "light-brighteyes",
    lore: "Lore of Light",
    name: "Brighteyes",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to gain the Dark Vision Creature Trait until your next turn. Additionally, become immune to the Blinded Condition while the effect persists; existing Blinded Conditions are ignored but return once it ends.",
  },
  {
    id: "light-purging-light",
    lore: "Lore of Light",
    name: "Purging Light",
    slCost: 2,
    effect:
      "Expend 2 SL of gathered power to make a melee weapon or piece of ammunition glow with furious light. Until your next turn, struck targets must pass a Challenging (+0) Endurance Test or gain a Blinded Condition. Targets with the Daemonic Trait take an additional +3 Damage.",
  },
  {
    id: "light-perfection-of-the-self",
    lore: "Lore of Light",
    name: "Perfection of the Self",
    slCost: 3,
    effect:
      "Expend 3 SL of gathered power to be engulfed in cleansing light. Until your next turn, ignore the effects of any Diseases, Poisons, Critical Wounds, or Mutations. Even severed limbs are temporarily replaced by constructions of pure Hysh.",
  },

  // ─── Lore of Metal (Chamon) ──────────────────────────────────────
  {
    id: "metal-reinforcement",
    lore: "Lore of Metal",
    name: "Reinforcement",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to strengthen metal armour you are wearing. Add 1 AP to any hit location protected by metal armour until your next turn.",
  },
  {
    id: "metal-heart-of-iron",
    lore: "Lore of Metal",
    name: "Heart of Iron",
    slCost: 2,
    effect:
      "In response to receiving a Critical Wound, expend 2 SL of gathered power. Your attacker must roll twice on the appropriate Critical Wound chart, choosing the least harmful result.",
  },
  {
    id: "metal-quicksilver-blade",
    lore: "Lore of Metal",
    name: "Quicksilver Blade",
    slCost: 3,
    effect:
      "Expend 3 SL of gathered power to make one metal weapon flow like water. Melee attacks this Round count as Lore of Metal spells: ignore the AP of metal armour and inflict additional Damage equal to the AP of metal armour on that Hit Location.",
  },

  // ─── Lore of Shadows (Ulgu) ──────────────────────────────────────
  {
    id: "shadows-ulgus-touch",
    lore: "Lore of Shadows",
    name: "Ulgu's Touch",
    slCost: 1,
    effect:
      "Expend 1 SL of gathered power to cloak yourself in raw Ulgu. Add SL up to your Willpower Bonus to any Stealth Tests this Round, applied after rolling but before results are described.",
    variableSL: true,
  },
  {
    id: "shadows-not-your-problem",
    lore: "Lore of Shadows",
    name: "Not Your Problem",
    slCost: 2,
    effect:
      "Expend 2 SL of gathered power to become less of a threat. If there is at least one other viable target a hostile enemy can attack on their next turn, they will attack that target instead.",
  },
  {
    id: "shadows-a-passing-shadow",
    lore: "Lore of Shadows",
    name: "A Passing Shadow",
    slCost: 3,
    effect:
      "Expend 3 SL of gathered power to become impossible to restrain. Slip free of any bonds; all attempts to grab, hold, or prevent your movement fail. Pass through difficult terrain without hindrance, and slip past barred windows and tight spaces.",
  },
] as const;
