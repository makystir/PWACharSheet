/**
 * A single entry in the precache manifest generated at build time.
 */
export interface PrecacheEntry {
  /** Path relative to base, e.g. "/PWACharSheet/assets/index-BB2fNIh-.css" */
  url: string;
  /** Content hash (MD5 hex, 8 chars) */
  revision: string;
}

/**
 * State exposed to the UI about an available service worker update.
 */
export interface SWUpdateState {
  updateAvailable: boolean;
  applying: boolean;
  error: string | null;
}

/**
 * Callback type for service worker update state changes.
 */
export type SWUpdateListener = (state: SWUpdateState) => void;

/**
 * Message sent from the client to the service worker to trigger activation.
 */
export interface SkipWaitingMessage {
  type: 'SKIP_WAITING';
}
