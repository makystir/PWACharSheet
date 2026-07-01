/**
 * Configuration options for the SW precache Vite plugin.
 */
export interface SWPrecachePluginOptions {
  /** Path to SW source template (e.g. "src/sw.ts") */
  swSrc: string;
  /** Output filename in dist (e.g. "sw.js") */
  swDest: string;
  /** File patterns to include in the precache manifest */
  include: RegExp[];
  /** File patterns to exclude from the precache manifest */
  exclude: RegExp[];
}
