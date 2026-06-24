export interface SymptomEntry {
  name: string;
  description: string;
  effects: string;
}

export const SYMPTOM_CATALOGUE: readonly SymptomEntry[] = [
  {
    name: "Blight",
    description: "Your skin becomes covered in unsightly sores and lesions that refuse to heal.",
    effects: "Suffer a penalty of –10 to all Fellowship Tests. Any Wounds lost to the disease cannot be healed until the disease is cured.",
  },
  {
    name: "Convulsions",
    description: "Your muscles seize and spasm uncontrollably, making coordinated action difficult.",
    effects: "Suffer a penalty of –10 to all Agility and Dexterity Tests. On a failed Endurance Test each hour, gain the Stunned Condition.",
  },
  {
    name: "Coughs and Sneezes",
    description: "Persistent, wracking coughs and violent sneezing fits strike without warning.",
    effects: "Suffer a penalty of –10 to all Stealth Tests and any Tests requiring concentration. Spread the disease to others within 2 yards on a failed Toughness Test.",
  },
  {
    name: "Delirium",
    description: "Fevered hallucinations and confusion cloud your mind, making rational thought a struggle.",
    effects: "Suffer a penalty of –20 to all Intelligence and Willpower Tests. On a failed Willpower Test, act irrationally as determined by the GM.",
  },
  {
    name: "Fever",
    description: "A burning fever takes hold, leaving you drenched in sweat and weakened.",
    effects: "Suffer a penalty of –10 to all Tests. If you also have Convulsions, the penalty increases to –20.",
  },
  {
    name: "Flux",
    description: "Severe gastrointestinal distress causes constant cramping, vomiting, and worse.",
    effects: "Suffer a penalty of –10 to all Tests. Lose 1 Wound per hour that cannot be healed until the disease ends. Must consume twice the normal amount of water or gain a Fatigued Condition.",
  },
  {
    name: "Gangrene",
    description: "Infected tissue blackens and dies, spreading a foul stench and threatening limb loss.",
    effects: "Suffer an infected wound on a random hit location. The location loses 1 Wound per day. If not treated with Surgery by the time Wounds reach 0 for that location, amputation is required.",
  },
  {
    name: "Lingering",
    description: "The disease resists all attempts to shake it off, persisting far longer than expected.",
    effects: "All attempts to cure or recover from this disease suffer a penalty of –20. Duration rolls receive an additional +50% (round up).",
  },
  {
    name: "Malaise",
    description: "A deep, bone-weary exhaustion settles in, sapping your vitality and will to act.",
    effects: "Gain a Fatigued Condition that cannot be removed until the disease is cured. Healing attempts on you suffer a –10 penalty.",
  },
  {
    name: "Nausea",
    description: "Waves of sickness wash over you, leaving you pale, shaking, and struggling to keep food down.",
    effects: "Suffer a penalty of –10 to all Tests. On a failed Endurance Test when stressed or in combat, gain the Stunned Condition for 1 round as you retch.",
  },
  {
    name: "Pox",
    description: "Weeping, pus-filled blisters erupt across your skin, highly visible and deeply unpleasant.",
    effects: "Suffer a penalty of –10 to Fellowship Tests. Others may refuse close contact. If Pox scars remain after recovery, the Fellowship penalty becomes permanent unless treated.",
  },
  {
    name: "Wounded",
    description: "The disease attacks your body directly, opening internal wounds that sap your strength.",
    effects: "Lose Wounds equal to a number determined by the disease. These Wounds cannot be healed until the disease is cured.",
  },
] as const;
