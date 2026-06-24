export interface DiseaseEntry {
  name: string;
  contraction: string;
  incubation: string;
  duration: string;
  symptoms: string[];
}

export const DISEASE_REGISTRY: readonly DiseaseEntry[] = [
  {
    name: "Blood Rot",
    contraction: "Infected Wound",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Blight", "Fever", "Malaise", "Wounded"],
  },
  {
    name: "The Bloody Flux",
    contraction: "Ingesting tainted food or water",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Fever", "Flux", "Nausea"],
  },
  {
    name: "Galloping Trots",
    contraction: "Ingesting tainted food or water",
    incubation: "1d10 hours",
    duration: "1d10 days",
    symptoms: ["Flux", "Nausea"],
  },
  {
    name: "Itching Pox",
    contraction: "Contact with an infected person",
    incubation: "1d10 days",
    duration: "1d10 + 10 days",
    symptoms: ["Blight", "Coughs and Sneezes", "Pox"],
  },
  {
    name: "Neiglish Rot",
    contraction: "Contact with the undead or tainted magic",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Convulsions", "Delirium", "Fever", "Gangrene", "Pox"],
  },
  {
    name: "Packer's Pox",
    contraction: "Contact with infected livestock or their hides",
    incubation: "1d10 + 5 days",
    duration: "1d10 days",
    symptoms: ["Blight", "Coughs and Sneezes", "Pox"],
  },
  {
    name: "Ratte Fever",
    contraction: "Bite from an infected rat or Skaven",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Delirium", "Fever", "Nausea"],
  },
  {
    name: "The Shakes",
    contraction: "Contact with an infected person or contaminated water",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Convulsions", "Fever", "Malaise", "Nausea"],
  },
  {
    name: "Black Plague",
    contraction: "Contact with an infected person or flea bites",
    incubation: "1d10 days",
    duration: "1d10 days",
    symptoms: ["Blight", "Convulsions", "Delirium", "Fever", "Flux", "Lingering", "Wounded"],
  },
] as const;
