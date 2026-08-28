export interface DiseaseEntry {
  name: string;
  contraction: string;
  incubation: string;
  duration: string;
  /**
   * Symptom references. A reference may carry an optional severity tag in
   * parentheses, e.g. "Blight (Moderate)" or "Flux (Severe)". The base name
   * (before the parenthesis) resolves to an entry in SYMPTOM_CATALOGUE; the
   * tag modifies the symptom's effect (see symptoms.ts). Order matches the book.
   */
  symptoms: string[];
  /**
   * Permanent consequences of the disease, if any (Core p.185 "Permanent"
   * field). Only present for diseases with long-term effects.
   */
  permanent?: string;
}

/**
 * Diseases per WFRP4e Core Rulebook p.185–186.
 *
 * All nine entries are the named diseases from the core rulebook. Contraction,
 * Incubation, Duration, and Symptoms (including severity tags) are transcribed
 * directly from the rulebook.
 */
export const DISEASE_REGISTRY: readonly DiseaseEntry[] = [
  {
    // Core p.185
    name: "The Black Plague",
    contraction: "Average (+20) Endurance Test for each hour (or part) spent in an area infested with infected fleas, or when exposed to infected fluids.",
    incubation: "1d10 minutes",
    duration: "3d10 days",
    symptoms: ["Buboes", "Blight (Moderate)", "Fever", "Gangrene", "Malaise"],
  },
  {
    // Core p.185
    name: "Blood Rot",
    contraction: "As a development of another disease or a Critical Wound.",
    incubation: "Instant",
    duration: "1d10 days",
    symptoms: ["Blight", "Fever (Severe)", "Malaise"],
  },
  {
    // Core p.185
    name: "The Bloody Flux",
    contraction: "Fail an Easy (+40) Toughness Test after an infected source enters the mouth.",
    incubation: "2d10 days",
    duration: "1d10 days",
    symptoms: ["Flux (Severe)", "Lingering (Challenging)", "Fever", "Malaise", "Nausea"],
  },
  {
    // Core p.186
    name: "Festering Wound",
    contraction: "Fail an Easy (+40) Endurance Test after combat with a creature with the Infected trait. Can also develop from a Minor Infection.",
    incubation: "1d10 days (instant if developed from another symptom)",
    duration: "1d10 days",
    symptoms: ["Fever", "Lingering (Challenging)", "Malaise", "Wounded"],
  },
  {
    // Core p.186
    name: "Galloping Trots",
    contraction: "Fail an Easy (+40) Toughness Test after an infected source enters the mouth.",
    incubation: "1d10 hours",
    duration: "1d10 days",
    symptoms: ["Flux (Moderate)", "Malaise", "Nausea"],
  },
  {
    // Core p.186
    name: "Itching Pox",
    contraction: "Fail an Average (+20) Endurance Test on contact with an infected individual, or when one coughs/sneezes nearby (about one Test per hour of exposure).",
    incubation: "1d10 days",
    duration: "1d10+7 days",
    symptoms: ["Coughs and Sneezes", "Pox"],
    permanent: "Once the disease is contracted, you become immune to catching it again.",
  },
  {
    // Core p.186
    name: "Minor Infection",
    contraction: "Fail a Very Easy (+60) Endurance Test after a combat in which you suffered a Critical Wound.",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Lingering (Easy)", "Malaise", "Wounded"],
  },
  {
    // Core p.186
    name: "Packer's Pox",
    contraction: "Fail an Easy (+40) Endurance Test after any contact with infected animals, hides, or bodies.",
    incubation: "1d10 days",
    duration: "5d10 days",
    symptoms: ["Lingering (Challenging)", "Pox"],
  },
  {
    // Core p.186
    name: "Ratte Fever",
    contraction: "Fail an Average (+20) Endurance Test after combat when wounded by rodents (including Skaven) with the Infected trait, or an Easy (+40) Endurance Test after an infected source enters the mouth.",
    incubation: "3d10+5 days",
    duration: "3d10+10 days",
    symptoms: ["Convulsions", "Fever", "Lingering (Average)", "Malaise", "Pox", "Wounded"],
  },
] as const;
