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
 * A symptom reference may carry a severity tag, e.g. "Flux (Severe)".
 * Split it into the base symptom name and the optional severity.
 */
export function parseSymptomReference(ref: string): { baseName: string; severity: string | null } {
  const match = ref.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { baseName: match[1].trim(), severity: match[2].trim() };
  }
  return { baseName: ref.trim(), severity: null };
}

/** A resolved disease symptom, including any per-disease severity tag. */
export interface ResolvedSymptom extends SymptomEntry {
  /** Severity tag from the disease reference (e.g. "Severe"), or null. */
  severity: string | null;
  /** Display name including severity, e.g. "Flux (Severe)". */
  displayName: string;
}

/**
 * Get the resolved symptom entries for a disease, in order.
 * Returns undefined if the disease name is not found.
 * Parses optional severity tags (e.g. "Blight (Moderate)") and resolves the
 * base name against the symptom catalogue. Defensively filters out any
 * unresolved symptom references.
 */
export function getDiseaseSymptoms(diseaseName: string): ResolvedSymptom[] | undefined {
  const disease = findDisease(diseaseName);
  if (!disease) {
    return undefined;
  }
  return disease.symptoms
    .map((ref) => {
      const { baseName, severity } = parseSymptomReference(ref);
      const entry = findSymptom(baseName);
      if (!entry) return undefined;
      return {
        ...entry,
        severity,
        displayName: severity ? `${entry.name} (${severity})` : entry.name,
      };
    })
    .filter((s): s is ResolvedSymptom => s !== undefined);
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
