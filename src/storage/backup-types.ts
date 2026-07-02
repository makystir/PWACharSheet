/**
 * Types and interfaces for bulk character backup and restore operations.
 */

// --- Backup file format ---

/** Top-level backup file structure */
export interface BackupFile {
  version: number;
  exportedAt: string; // ISO-8601
  characterCount: number;
  characters: BackupCharacterEntry[];
}

/** A single character entry within a backup file */
export interface BackupCharacterEntry {
  id: string;
  character: Record<string, unknown>; // Full character JSON (single-export format)
  portrait: string; // base64 data-URL or empty string
}

/** Metadata extracted during validation */
export interface BackupMetadata {
  version: number;
  exportedAt: string;
  characterCount: number;
}

// --- Backup operations ---

/** Progress callback for bulk operations */
export type ProgressCallback = (current: number, total: number) => void;

/** A character that was skipped during backup */
export interface SkippedCharacter {
  name: string;
  reason: string;
}

/** Result of the backup assembly operation */
export type BackupResult =
  | { ok: true; payload: BackupFile }
  | { ok: false; error: string; skipped?: SkippedCharacter[] };

// --- Restore operations ---

/** Validation result for a backup file */
export type ValidationResult =
  | { ok: true; metadata: BackupMetadata; characters: BackupCharacterEntry[] }
  | { ok: false; error: string };

/** Summary of a completed restore operation */
export interface RestoreSummary {
  imported: number;
  skipped: number;
  skippedDetails: Array<{ nameOrIndex: string; reason: string }>;
  duplicateNames: string[];
  stoppedByQuota: boolean;
}
