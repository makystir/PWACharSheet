export interface SymptomEntry {
  name: string;
  description: string;
  effects: string;
}

/**
 * The twelve disease Symptoms, per WFRP4e Core Rulebook p.187–188.
 *
 * `description` is the book's flavour text; `effects` summarises the mechanical
 * rules (including how the optional severity tags — Moderate/Severe/etc. —
 * modify the symptom). Severity is attached per-disease (see diseases.ts), so
 * the effect text describes what each severity does.
 */
export const SYMPTOM_CATALOGUE: readonly SymptomEntry[] = [
  {
    // Core p.187
    name: "Blight",
    description: "You are seriously ill and perhaps close to Morr's Portal as deadly poisons flood your body.",
    effects: "Pass a Very Easy (+60) Endurance Test daily (normally when you sleep) or die. If marked (Moderate) the Test is Easy (+40); if (Severe) it is Average (+20). Treatment: none that work.",
  },
  {
    // Core p.188
    name: "Buboes",
    description: "You have huge, painful swellings of the lymph nodes in the groin, neck, or armpits that may bleed or seep pus.",
    effects: "Suffer −10 to all physical Tests, and −10 to all Fellowship Tests if the buboes can be seen or smelled. Treatment: a Heal Test with Surgery lances them (removing the penalty); on failure gain a Festering Wound. Once lanced, take a Difficult (−10) Endurance Test each day or they swell back.",
  },
  {
    // Core p.188
    name: "Convulsions",
    description: "Your body periodically spasms or shakes as the infection seemingly uses you like a puppet.",
    effects: "Suffer −10 to all physical Tests. If (Moderate) the penalty is −20. If (Severe) you must be tied down and are effectively incapacitated. Treatment: rare apothecary medicine can reduce severity by one step for a day.",
  },
  {
    // Core p.188
    name: "Coughs and Sneezes",
    description: "You intermittently cough or sneeze, spreading your disease to all around you.",
    effects: "Anyone in your environment is exposed to your disease and must Test for Contraction once per hour (or part thereof) of exposure. Treatment: none that work.",
  },
  {
    // Core p.188
    name: "Fever",
    description: "Your temperature is high, you're likely sweating, and you really don't look at all well.",
    effects: "Suffer −10 to all physical and Fellowship Tests. If (Severe), you are incapacitated and bed-ridden: gain the Unconscious Condition (a Resolve point buys a few minutes of consciousness). Treatment: genuine cures (10%) remove a non-Severe Fever if you pass a Challenging (+0) Endurance Test.",
  },
  {
    // Core p.188
    name: "Flux",
    description: "A rumble and a grumble, then you're off for another sprint to the outhouse — pale, weary, and utterly drained.",
    effects: "At any point the GM may require you reach a privy within Toughness Bonus rounds; either way your body empties spectacularly. If (Moderate) this can happen twice per session; if (Severe) three times per session and you also lose 1 Wound per visit. Treatment: genuine cures (10%) hold off the Flux for Toughness Bonus hours.",
  },
  {
    // Core p.188
    name: "Gangrene",
    description: "Your flesh is turning black, dying, infected with something awful, and it isn't going to get better.",
    effects: "Roll a Hit Location for the affected part (Body = no gangrene this time; Head = nose; Arms = fingers; Legs = feet). Each day take an Average (+20) Endurance Test; failing more times than your Toughness Bonus destroys the location (as Amputation). While gangrenous, suffer −10 to all Fellowship Tests and the Wounded symptom, and also suffer Blight until the tissue is amputated. Treatment: amputation is the only effective treatment.",
  },
  {
    // Core p.188
    name: "Lingering",
    description: "You have an infection that just refuses to go away. Indeed, you fear it may be getting worse…",
    effects: "When the disease reaches the end of its duration, take an Endurance Test at the marked Difficulty (e.g. Lingering (Average) or (Easy)). Marginal Failure (0): duration extends 1d10 days. Failure (−2): develop a Festering Wound. Astounding Failure (−6): develop Blood Rot instead. Treatment: genuine cures (10%) negate the Test if taken on the correct day.",
  },
  {
    // Core p.188
    name: "Malaise",
    description: "You don't feel at all well — tired, unable to concentrate, and just generally ill.",
    effects: "Gain a Fatigued Condition that can only be removed once you have recovered from the illness. Treatment: usually-genuine medicine (75%) lets you pass a Challenging (+0) Endurance Test to ignore the symptom for the day.",
  },
  {
    // Core p.188
    name: "Nausea",
    description: "You feel very sick and are prone to vomiting if you move around too quickly.",
    effects: "Whenever you fail a Test involving physical movement, you vomit and gain the Stunned Condition. Treatment: common medicine (60% genuine) lets you pass a Challenging (+0) Endurance Test to ignore the Nausea for Toughness Bonus hours.",
  },
  {
    // Core p.188
    name: "Pox",
    description: "You are covered in pustules, inflamed swellings, disgusting rashes, or itchy spots.",
    effects: "Suffer −10 to Fellowship Tests. Pass an Average (+20) Cool Test to avoid conspicuous scratching. When the Pox ends, take an Average (+20) Cool Test; on failure gain permanent scarring on a Hit Location (Head = permanently lose 1 Fellowship). Treatment: common creams make the anti-scratching Cool Test Very Easy (+60).",
  },
  {
    // Core p.188
    name: "Wounded",
    description: "You have a wound or open sore that does not heal properly because of an infection.",
    effects: "For each Wounded symptom, one of your Wounds cannot be healed and stays open. Every day take an Easy (+20) Endurance Test or gain a Festering Wound (if you don't already have one). Treatment: a daily successful Heal Test keeps the wound clean and avoids the Endurance Test.",
  },
] as const;
