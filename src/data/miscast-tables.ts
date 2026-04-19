export interface MiscastTableEntry {
  min: number;
  max: number;
  name: string;
  effect: string;
  special?: 'cascading_chaos' | 'multiplying_misfortune';
}

export const MINOR_MISCAST_TABLE: MiscastTableEntry[] = [
  { min: 1, max: 10, name: "Witchfire", effect: "Caster's hands glow with eldritch light for 1d10 rounds. All Stealth tests suffer -20." },
  { min: 11, max: 20, name: "Sickened", effect: "Caster gains the Nauseated condition for 1d10 rounds." },
  { min: 21, max: 30, name: "Unfocused", effect: "Caster suffers -10 to all tests for 1d10 rounds." },
  { min: 31, max: 40, name: "Pushed Back", effect: "Caster is pushed 1d10 yards in a random direction." },
  { min: 41, max: 50, name: "Knocked Down", effect: "Caster gains the Prone condition." },
  { min: 51, max: 60, name: "Distracted", effect: "All allies within WPB yards gain the Surprised condition." },
  { min: 61, max: 70, name: "Aethyric Shock", effect: "Caster takes 1d10 wounds ignoring Toughness Bonus and Armour." },
  { min: 71, max: 80, name: "Drained", effect: "Caster gains 3 Fatigued conditions." },
  { min: 81, max: 90, name: "Loss of Concentration", effect: "All ongoing spells maintained by the caster immediately end." },
  { min: 91, max: 95, name: "Multiplying Misfortune", effect: "Roll two more Minor Miscasts.", special: "multiplying_misfortune" },
  { min: 96, max: 100, name: "Cascading Chaos", effect: "Roll on the Major Miscast Table instead.", special: "cascading_chaos" },
];

export const MAJOR_MISCAST_TABLE: MiscastTableEntry[] = [
  { min: 1, max: 10, name: "Aethyric Feedback", effect: "Caster takes 1d10+SL wounds ignoring TB and AP. All allies within WPB yards take 1d10 wounds." },
  { min: 11, max: 20, name: "Temporal Instability", effect: "Caster misses next 1d10 turns as time warps around them." },
  { min: 21, max: 30, name: "Psychic Blast", effect: "Everyone within WPB yards must pass a Hard (-20) WP test or gain the Broken condition." },
  { min: 31, max: 40, name: "Aethyric Drain", effect: "Caster loses ability to cast spells for 1d10 hours." },
  { min: 41, max: 50, name: "Corruption", effect: "Caster gains 1d10 Corruption points." },
  { min: 51, max: 60, name: "Mutation", effect: "Caster immediately gains a random physical mutation." },
  { min: 61, max: 70, name: "Daemonic Attention", effect: "A minor Daemon manifests within 1d10 yards of the caster." },
  { min: 71, max: 80, name: "Aethyric Storm", effect: "Wild magic surges. All spells within WPB×10 yards are dispelled. Area becomes a dead magic zone for 1d10 rounds." },
  { min: 81, max: 90, name: "Catastrophic Overload", effect: "Caster takes 2d10+SL wounds ignoring TB and AP. Caster gains the Unconscious condition." },
  { min: 91, max: 95, name: "The Horned Rat's Gaze", effect: "Caster gains 1d10 Corruption and a random mental mutation." },
  { min: 96, max: 100, name: "Realm of Chaos", effect: "Caster is sucked into the Realm of Chaos. Roll on the Realm of Chaos table or consult the GM." },
];
