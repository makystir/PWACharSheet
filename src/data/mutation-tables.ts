export interface MutationTableEntry {
  min: number;
  max: number;
  name: string;
  effect: string;
}

export const PHYSICAL_MUTATION_TABLE: MutationTableEntry[] = [
  { min: 1, max: 5, name: "Animalistic Legs", effect: "+1 Movement" },
  { min: 6, max: 10, name: "Corpulent", effect: "–1 Movement, +5 Strength, +5 Toughness" },
  { min: 11, max: 15, name: "Distended Digits", effect: "+10 Dexterity" },
  { min: 16, max: 20, name: "Emaciated", effect: "–10 Strength, +5 Agility" },
  { min: 21, max: 25, name: "Enormous Eye", effect: "+10 on Perception Tests involving sight" },
  { min: 26, max: 30, name: "Extra Leg Joints", effect: "+5 Agility" },
  { min: 31, max: 35, name: "Extra Mouth", effect: "Roll on the Hit Location table to see where" },
  { min: 36, max: 40, name: "Fleshy Tentacle", effect: "Gain the Tentacles Creature Trait" },
  { min: 41, max: 45, name: "Glowing Skin", effect: "Effective light of a candle" },
  { min: 46, max: 50, name: "Inhuman Beauty", effect: "+10 Fellowship; you do not scar" },
  { min: 51, max: 55, name: "Inverted Face", effect: "–20 to all Fellowship Tests" },
  { min: 56, max: 60, name: "Iron Skin", effect: "+2 AP to all locations, –10 Agility" },
  { min: 61, max: 65, name: "Lolling Tongue", effect: "–10 to all Language Tests when speaking" },
  { min: 66, max: 70, name: "Patchy Feathers", effect: "Roll on the Hit Location table twice to see where" },
  { min: 71, max: 75, name: "Short Legs", effect: "–1 Movement" },
  { min: 76, max: 80, name: "Thorny Scales", effect: "+1 AP to all locations" },
  { min: 81, max: 85, name: "Uneven Horns", effect: "+1 AP to Head; counts as Creature Weapon (Damage = SB)" },
  { min: 86, max: 90, name: "Weeping Pus", effect: "Roll on the Hit Location Table to see from where" },
  { min: 91, max: 95, name: "Whiskered Snout", effect: "+10 Track" },
  { min: 96, max: 100, name: "GM's Choice", effect: "The GM chooses a Mutation or Creature Trait" },
];

export const MENTAL_MUTATION_TABLE: MutationTableEntry[] = [
  { min: 1, max: 5, name: "Awful Cravings", effect: "–5 Fellowship, –5 Willpower" },
  { min: 6, max: 10, name: "Beast Within", effect: "+10 Willpower, –5 Fellowship, –5 Intelligence" },
  { min: 11, max: 15, name: "Chaotic Dreams", effect: "Gain the Fatigued Condition for the first two hours of every day" },
  { min: 16, max: 20, name: "Crawling Skin", effect: "–5 Initiative, –5 Dexterity" },
  { min: 21, max: 25, name: "Erratic Fantasist", effect: "–5 Initiative, –5 Willpower" },
  { min: 26, max: 30, name: "Fearful Concern", effect: "–10 Willpower" },
  { min: 31, max: 35, name: "Hateful Impulses", effect: "Subject to Animosity to all not of your species" },
  { min: 36, max: 40, name: "Hollow Heart", effect: "+10 Willpower, –10 Fellowship" },
  { min: 41, max: 45, name: "Jealous Thoughts", effect: "–10 Fellowship" },
  { min: 46, max: 50, name: "Lonely Spirit", effect: "–10 to any Test when alone" },
  { min: 51, max: 55, name: "Mental Blocks", effect: "–10 Intelligence" },
  { min: 56, max: 60, name: "Profane Urgency", effect: "–10 Willpower, +10 Agility" },
  { min: 61, max: 65, name: "Shaky Morale", effect: "Gain the Broken condition if you fail a Test derived from Willpower" },
  { min: 66, max: 70, name: "Suspicious Mind", effect: "–5 Initiative, –5 Intelligence" },
  { min: 71, max: 75, name: "Thrill Hunter", effect: "+10 Willpower, –10 Initiative" },
  { min: 76, max: 80, name: "Tortured Visions", effect: "–10 Initiative" },
  { min: 81, max: 85, name: "Totally Unhinged", effect: "–20 Fellowship, +10 Willpower" },
  { min: 86, max: 90, name: "Unending Malice", effect: "–10 to any Test not hurting another; +10 on Tests to hurt" },
  { min: 91, max: 95, name: "Unholy Rage", effect: "Subject to Frenzy, +10 Weapon Skill" },
  { min: 96, max: 100, name: "Worried Jitters", effect: "+5 Agility, –5 Fellowship" },
];
