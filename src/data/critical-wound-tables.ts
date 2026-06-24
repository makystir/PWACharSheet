export interface CriticalWoundTableEntry {
  min: number;
  max: number;
  name: string;
  effect: string;
  severity: number;
}

export const HEAD_CRITICAL_TABLE: CriticalWoundTableEntry[] = [
  { min: 1, max: 10, name: "Lacerated Ear", effect: "Suffer 1 Bleeding Condition", severity: 1 },
  { min: 11, max: 20, name: "Minor Cut", effect: "Suffer 1 Bleeding Condition. –10 to Fellowship Tests for d10 days due to ugly scab", severity: 1 },
  { min: 21, max: 30, name: "Stunned", effect: "Suffer 1 Stunned Condition", severity: 1 },
  { min: 31, max: 40, name: "Dazed", effect: "Suffer 2 Stunned Conditions. –10 to all Tests until end of next turn", severity: 2 },
  { min: 41, max: 50, name: "Concussion", effect: "Gain the Unconscious Condition for d10 rounds. –20 to Intelligence Tests for d10 days", severity: 2 },
  { min: 51, max: 60, name: "Broken Nose", effect: "Suffer 2 Bleeding Conditions. –10 to all Tests for d10 days. Permanent scarring", severity: 2 },
  { min: 61, max: 70, name: "Broken Jaw", effect: "Suffer 2 Stunned Conditions. Cannot speak for d10 days. –30 to Fellowship Tests involving speech until healed", severity: 3 },
  { min: 71, max: 80, name: "Cracked Skull", effect: "Suffer 3 Bleeding Conditions. Gain Unconscious Condition. –20 to all Tests for 2d10 days. Permanent –5 Intelligence", severity: 3 },
  { min: 81, max: 90, name: "Smashed Skull", effect: "Suffer 4 Bleeding Conditions. Gain Unconscious Condition. Permanent –10 Intelligence, –10 Initiative. Requires Surgery or death in d10 hours", severity: 4 },
  { min: 91, max: 95, name: "Severed Ear", effect: "Lose an ear. Suffer 3 Bleeding Conditions. Permanent –10 Fellowship, –10 Perception Tests involving hearing", severity: 4 },
  { min: 96, max: 100, name: "Decapitation", effect: "Death. Head is severed from the body", severity: 5 },
];

export const ARM_CRITICAL_TABLE: CriticalWoundTableEntry[] = [
  { min: 1, max: 10, name: "Sprained Wrist", effect: "Drop whatever is held in that hand. –10 to Tests using that hand for d10 rounds", severity: 1 },
  { min: 11, max: 20, name: "Torn Muscle", effect: "Suffer 1 Bleeding Condition. –10 to Weapon Skill and Dexterity Tests using that arm for d10 days", severity: 1 },
  { min: 21, max: 30, name: "Deep Cut", effect: "Suffer 2 Bleeding Conditions. Drop held item. –10 to all Tests using that arm until Bleeding is removed", severity: 1 },
  { min: 31, max: 40, name: "Dislocated Shoulder", effect: "Drop held item. Arm is useless for d10 rounds until reset with a successful Heal Test", severity: 2 },
  { min: 41, max: 50, name: "Fractured Hand", effect: "Suffer 1 Bleeding Condition. –20 to all Tests using that hand for 2d10 days", severity: 2 },
  { min: 51, max: 60, name: "Broken Forearm", effect: "Suffer 2 Bleeding Conditions. Arm is useless until set with a successful Heal Test. –20 to all Tests using that arm for 30 days", severity: 2 },
  { min: 61, max: 70, name: "Shattered Elbow", effect: "Suffer 2 Bleeding Conditions. Arm is useless for d10 days. Permanent –5 Dexterity", severity: 3 },
  { min: 71, max: 80, name: "Compound Fracture", effect: "Suffer 3 Bleeding Conditions. Gain Stunned Condition. Arm is useless until Surgery. Permanent –10 Dexterity", severity: 3 },
  { min: 81, max: 90, name: "Mangled Hand", effect: "Suffer 3 Bleeding Conditions. Lose d10 fingers. Permanent –10 Dexterity. Cannot hold items if all fingers lost", severity: 4 },
  { min: 91, max: 95, name: "Severed Hand", effect: "Suffer 4 Bleeding Conditions. Hand is permanently lost. Cannot hold anything in that hand", severity: 4 },
  { min: 96, max: 100, name: "Severed Arm", effect: "Suffer 5 Bleeding Conditions. Arm is permanently lost. Death in d10 rounds without Surgery or Tourniquet", severity: 5 },
];

export const BODY_CRITICAL_TABLE: CriticalWoundTableEntry[] = [
  { min: 1, max: 10, name: "Winded", effect: "Suffer 1 Fatigued Condition. –10 to Agility Tests for d10 rounds", severity: 1 },
  { min: 11, max: 20, name: "Bruised Ribs", effect: "Suffer 1 Stunned Condition. –10 to Agility and Strength Tests for d10 days", severity: 1 },
  { min: 21, max: 30, name: "Flesh Wound", effect: "Suffer 2 Bleeding Conditions. –10 to all physical Tests until Bleeding is removed", severity: 1 },
  { min: 31, max: 40, name: "Cracked Ribs", effect: "Suffer 1 Stunned Condition, 1 Bleeding Condition. –20 to Agility Tests for 2d10 days", severity: 2 },
  { min: 41, max: 50, name: "Torn Ligaments", effect: "Suffer 1 Fatigued Condition. –10 to Strength and Toughness Tests for 2d10 days", severity: 2 },
  { min: 51, max: 60, name: "Deep Chest Wound", effect: "Suffer 3 Bleeding Conditions. –20 to all physical Tests for d10 days", severity: 2 },
  { min: 61, max: 70, name: "Broken Ribs", effect: "Suffer 2 Bleeding Conditions, 2 Stunned Conditions. –30 to Agility Tests for 30 days. Risk of punctured lung on further crits", severity: 3 },
  { min: 71, max: 80, name: "Organ Damage", effect: "Suffer 3 Bleeding Conditions. Gain Unconscious Condition. Permanent –10 Toughness. Requires Surgery or death in d10 days", severity: 3 },
  { min: 81, max: 90, name: "Pierced Lung", effect: "Suffer 4 Bleeding Conditions. Gain Unconscious Condition. –20 to all Tests permanently. Requires Surgery or death in d10 hours", severity: 4 },
  { min: 91, max: 95, name: "Ruptured Organs", effect: "Suffer 4 Bleeding Conditions. Gain Unconscious Condition. Death in d10 rounds without Surgery", severity: 4 },
  { min: 96, max: 100, name: "Disembowelled", effect: "Death. Torso is split open, no possibility of survival", severity: 5 },
];

export const LEG_CRITICAL_TABLE: CriticalWoundTableEntry[] = [
  { min: 1, max: 10, name: "Twisted Ankle", effect: "Suffer 1 Fatigued Condition. –10 to Agility Tests and –1 Movement for d10 rounds", severity: 1 },
  { min: 11, max: 20, name: "Muscle Tear", effect: "Suffer 1 Bleeding Condition. –10 to Agility Tests for d10 days", severity: 1 },
  { min: 21, max: 30, name: "Deep Gash", effect: "Suffer 2 Bleeding Conditions. –1 Movement until Bleeding is removed", severity: 1 },
  { min: 31, max: 40, name: "Knee Injury", effect: "Suffer 1 Stunned Condition. –20 to Agility Tests and –1 Movement for 2d10 days", severity: 2 },
  { min: 41, max: 50, name: "Dislocated Knee", effect: "Gain the Prone Condition. Leg is useless for d10 rounds until reset with a successful Heal Test. –1 Movement for d10 days", severity: 2 },
  { min: 51, max: 60, name: "Broken Shin", effect: "Suffer 2 Bleeding Conditions. Gain Prone Condition. –2 Movement for 30 days. Cannot Run", severity: 2 },
  { min: 61, max: 70, name: "Shattered Kneecap", effect: "Suffer 2 Bleeding Conditions, 2 Stunned Conditions. –2 Movement for 30 days. Permanent –5 Agility", severity: 3 },
  { min: 71, max: 80, name: "Compound Leg Fracture", effect: "Suffer 3 Bleeding Conditions. Gain Prone Condition. Leg is useless until Surgery. Permanent –10 Agility", severity: 3 },
  { min: 81, max: 90, name: "Crushed Foot", effect: "Suffer 3 Bleeding Conditions. Permanent –2 Movement, –10 Agility. Cannot Run permanently", severity: 4 },
  { min: 91, max: 95, name: "Severed Foot", effect: "Suffer 4 Bleeding Conditions. Foot is permanently lost. Permanent –3 Movement. Cannot Run", severity: 4 },
  { min: 96, max: 100, name: "Severed Leg", effect: "Suffer 5 Bleeding Conditions. Leg is permanently lost. Death in d10 rounds without Surgery or Tourniquet", severity: 5 },
];
