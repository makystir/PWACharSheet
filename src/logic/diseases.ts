import type { DiseaseEntry } from '../data/diseases';
import type { SymptomEntry } from '../data/symptoms';
import { DISEASE_REGISTRY } from '../data/diseases';
import { SYMPTOM_CATALOGUE } from '../data/symptoms';

/**
 * Find a disease by exact case-sensitive name match.
 */
export function findDisease(name: string): DiseaseEntry | undefined {
  return DISEASE_REGISTRY.find(d => d.name === name);
}

/**
 * Find a symptom by exact case-sensitive name match.
 */
export function findSymptom(name: string): SymptomEntry | undefined {
  return SYMPTOM_CATALOGUE.find(s => s.name === name);
}

/**
 * Get the resolved symptom entries for a disease, in order.
 * Returns undefined if the disease name is not found.
 * Defensively filters out any unresolved symptom references.
 */
export function getDiseaseSymptoms(diseaseName: string): SymptomEntry[] | undefined {
  const disease = findDisease(diseaseName);
  if (!disease) {
    return undefined;
  }
  return disease.symptoms
    .map(name => findSymptom(name))
    .filter((s): s is SymptomEntry => s !== undefined);
}

// ─── Active Disease Management ────────────────────────────────────────────────

export interface ActiveDisease {
  id: number;
  diseaseName: string;
  contracted: number;   // Date.now() timestamp
  notes: string;
}

/**
 * Add a new active disease record with auto-incrementing ID and timestamp.
 * Returns a new array without mutating the input.
 */
export function addDisease(diseases: ActiveDisease[], diseaseName: string): ActiveDisease[] {
  const newId = diseases.length === 0 ? 1 : Math.max(...diseases.map(d => d.id)) + 1;
  const newDisease: ActiveDisease = {
    id: newId,
    diseaseName,
    contracted: Date.now(),
    notes: '',
  };
  return [...diseases, newDisease];
}

/**
 * Remove an active disease by ID.
 * Returns a new array without mutating the input.
 * No-op if the ID is not found.
 */
export function removeDisease(diseases: ActiveDisease[], id: number): ActiveDisease[] {
  return diseases.filter(d => d.id !== id);
}

/**
 * Update the notes field for an active disease by ID.
 * Returns a new array without mutating the input.
 * No-op if the ID is not found.
 */
export function updateDiseaseNotes(diseases: ActiveDisease[], id: number, notes: string): ActiveDisease[] {
  return diseases.map(d =>
    d.id === id ? { ...d, notes } : d
  );
}
