/**
 * Maps variant talent names (as used in career data) to their canonical
 * TALENT_DB entry names. This allows tooltip resolution to succeed when
 * career data uses alternate spellings, hyphenation, or spacing.
 */
export const TALENT_ALIASES: Record<string, string> = {
  'Warleader': 'War Leader',
  'Public Speaker': 'Public Speaking',
  'Public-Speaking': 'Public Speaking',
  'Cat Fall': 'Catfall',
  'Detect Artifact': 'Detect Artefact',
  'Stouthearted': 'Stout-hearted',
  'Strongminded': 'Strong-minded',
  'Trick Rider': 'Trick Riding',
  'Trick-Riding': 'Trick Riding',
  'Wellprepared': 'Well-prepared',
};
