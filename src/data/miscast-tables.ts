export interface MiscastTableEntry {
  min: number;
  max: number;
  name: string;
  effect: string;
  special?: 'cascading_chaos' | 'multiplying_misfortune' | 'marked_by_magic';
}

export const MINOR_MISCAST_TABLE: MiscastTableEntry[] = [
  { min: 1, max: 5, name: "Witchsign", effect: "The next living creature born within 1 mile is mutated." },
  { min: 6, max: 10, name: "Soured Milk", effect: "All milk within 1d100 yards goes sour instantly." },
  { min: 11, max: 15, name: "Blight", effect: "Willpower Bonus fields within Willpower Bonus miles suffer a blight, and all crops rot overnight." },
  { min: 16, max: 20, name: "Soulwax", effect: "Your ears clog instantly with a thick wax. Gain 1 Deafened Condition, which is not removed until someone cleans them for you (with a successful Average (+20) Heal Test)." },
  { min: 21, max: 25, name: "Freezing Breath", effect: "The temperature in your immediate vicinity falls suddenly and people's breath can be seen in the air. People within Willpower Bonus yards of you must make a Challenging (+0) Endurance Test or suffer -10 Ballistic Skill, Agility, and Dexterity due to the sudden cold until they leave the area. The effect lasts for 1 minute." },
  { min: 26, max: 30, name: "Unfasten", effect: "On your person, every buckle unfastens and every lace unties, which may cause belts to fall, pouches to open, bags to fall, and armour to slip." },
  { min: 31, max: 35, name: "Wayward Garb", effect: "Your clothes seem to writhe with a mind of their own. Receive 1 Entangled Condition with a Strength of 1d10 × 5 to resist." },
  { min: 36, max: 40, name: "Curse of Temperance", effect: "All alcohol within 1d100 yards goes bad, tasting bitter and foul. This helps explain why spellcasting is frowned upon in many of the Old World's taverns." },
  { min: 41, max: 45, name: "Cloyed Tongue", effect: "You suffer a -10 penalty to all Language Tests (including Casting Tests) for 1d10 Rounds." },
  { min: 46, max: 50, name: "Driven to Distraction", effect: "If engaged in combat, gain the Surprised Condition. Otherwise, you are completely startled, your heart racing, and unable to concentrate for a few moments." },
  { min: 51, max: 55, name: "Unholy Visions", effect: "Fleeting visions of profane and unholy acts harass you. Receive a Blinded Condition; pass a Challenging (+0) Cool Test or gain another." },
  { min: 56, max: 60, name: "Hexeyes", effect: "Your eyes turn an unnatural colour associated with your Lore for 1d10 hours. While your eyes are discoloured, you have 1 Blinded Condition that cannot be resolved by any means. You lose the ability to use the Magical Sense and Second Sight Talents during this time." },
  { min: 61, max: 65, name: "Rupture", effect: "Your nose, eyes, and ears bleed profusely. Gain a Bleeding Condition." },
  { min: 66, max: 70, name: "Fell Whispers", effect: "The GM may choose two reversed symbols from the Symbols Table. Pass an Average (+20) Willpower Test or gain 1 Corruption point." },
  { min: 71, max: 75, name: "The Horror!", effect: "You are disturbed by a sudden rush of disturbing visions of the Realm of Chaos. The GM may select a reversed symbol from the Symbols Table. Pass a Hard (-20) Cool Test or gain 1 Broken Condition." },
  { min: 76, max: 80, name: "Curse of Corruption", effect: "Gain 1 Corruption point." },
  { min: 81, max: 85, name: "Intestinal Rebellion", effect: "Your bowels move uncontrollably and you soil yourself. Gain 1 Fatigued Condition, which cannot be removed until you can change your clothes and clean yourself up." },
  { min: 86, max: 90, name: "Marked by Magic", effect: "You embody a physical sign of the Wind you work with. Roll on the appropriate Arcane Marks table for your Lore. If no Arcane Marks Table suits your magical tradition, or if you gain a mark you already possess, roll on the Major Miscast Table instead.", special: "marked_by_magic" },
  { min: 91, max: 95, name: "Multiplying Misfortune", effect: "Roll twice on this table, rerolling any results between 91-00.", special: "multiplying_misfortune" },
  { min: 96, max: 100, name: "Cascading Chaos", effect: "Roll on the Major Miscast Table.", special: "cascading_chaos" },
];

export const MAJOR_MISCAST_TABLE: MiscastTableEntry[] = [
  { min: 1, max: 5, name: "Ghostly Voices", effect: "Everyone within Willpower yards hears darkly seductive whispering of voices emanating from the Realm of Chaos. All sentient creatures must pass an Average (+20) Cool Test or gain 1 Corruption point." },
  { min: 6, max: 10, name: "Aethyric Shock", effect: "You suffer 1d10 Wounds, ignoring Toughness Bonus and Armour Points. Pass an Average (+20) Endurance Test or also gain a Stunned Condition." },
  { min: 11, max: 15, name: "Death Walker", effect: "Your footsteps leave death in their wake. For the next 1d10 hours, any plant life near you withers and dies." },
  { min: 16, max: 20, name: "Double Trouble", effect: "The effect of the spell you cast occurs elsewhere within 1d10 miles. At the GM's discretion, it should have consequences whenever possible." },
  { min: 21, max: 25, name: "Soulfire", effect: "Gain an Ablaze Condition, as you are wreathed in unholy flames with a colour associated with your Lore." },
  { min: 26, max: 30, name: "Speak in Tongues", effect: "You gabble unintelligibly for 1d10 rounds. During this time, you cannot communicate verbally, or make any Casting Tests. You may otherwise act normally." },
  { min: 31, max: 35, name: "Swarmed", effect: "You are engaged by a swarm of aethyric Rats, Giant Spiders, Snakes, or similar (GM's choice). Use the standard profiles for the relevant creature type, adding the Swarm Creature Trait. After 1d10 rounds, if not yet destroyed, the swarm retreats." },
  { min: 36, max: 40, name: "Ragdoll", effect: "You are flung 1d10 yards through the air in a random direction, taking 1d10 Wounds on landing, ignoring Armour Points, and receiving the Prone Condition." },
  { min: 41, max: 45, name: "Limb Frozen", effect: "One limb (randomly determined) is frozen in place for 1d10 hours. The limb is useless, as if it had been Amputated." },
  { min: 46, max: 50, name: "Darkling Sight", effect: "You lose the benefit of the Second Sight Talent for 1d10 hours. Channelling Tests also suffer a -20 penalty for the duration." },
  { min: 51, max: 55, name: "Chaotic Foresight", effect: "Gain a bonus pool of 1d10 Fortune points (this may take you beyond your natural limit). Every time you spend one of these points, gain 1 Corruption point. Any of these points remaining at the end of the session are lost. The GM also assigns you a number of reversed symbols equal to your Willpower Bonus." },
  { min: 56, max: 60, name: "Levitation", effect: "You are borne aloft on the Winds of Magic, floating 1d10 yards above the ground for 1d10 minutes. Other Characters may forcibly move you, and you may move using spells, wings, or similar, but will continually return to your levitating position if otherwise left alone." },
  { min: 61, max: 65, name: "Regurgitation", effect: "You spew uncontrollably, throwing up far more foul-smelling vomitus than your body can possibly contain. Gain the Stunned Condition, which lasts for 1d10 Rounds." },
  { min: 66, max: 70, name: "Chaos Quake", effect: "All creatures within 1d100 yards must pass an Average (+20) Athletics Test or gain the Prone Condition." },
  { min: 71, max: 75, name: "Forgetfulness", effect: "The spell you are trying to cast is lost to your memory. If you had previously memorised the spell, you no longer recall it and must memorise it again. If casting from a grimoire, the page upon which the spell is written bursts into flames." },
  { min: 76, max: 80, name: "Traitor's Heart", effect: "The Dark Gods entice you to commit horrendous perfidy. Should you attack or otherwise betray an ally to the full extent of your capabilities, regain all Fortune points. If you cause another Character to lose a Fate point, gain +1 Fate point." },
  { min: 81, max: 85, name: "Foul Enfeeblement", effect: "Gain 1 Corruption point, a Prone Condition, and a Fatigued Condition." },
  { min: 86, max: 90, name: "Hellish Stench", effect: "You smell really bad! You gain the Distracting Creature Trait, and probably the enmity of anyone with a sense of smell. This lasts for 1d10 hours." },
  { min: 91, max: 95, name: "Power Drain", effect: "You are unable to use the Talent used to cast the spell (usually Arcane Magic) for 1d10 minutes." },
  { min: 96, max: 100, name: "Aethyric Feedback", effect: "Everyone within Willpower Bonus yards - friend and foe alike - suffers 1d10 Wounds, ignoring Toughness Bonus and Armour Points, and receives the Prone Condition. If there are no targets in range, the magic has nowhere to vent, so your head explodes, killing you instantly." },
];
