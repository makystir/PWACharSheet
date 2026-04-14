import { getSkillDescription } from '../data/skill-descriptions';
import { CONDITIONS } from '../data/conditions';
import { TALENT_DB } from '../data/talents';

/** Structured content for a tooltip popover */
export interface TooltipContent {
  title: string;
  sections: { label: string; text: string }[];
}

/** Returns tooltip content for a skill, or null if no description available */
export function resolveSkillTooltip(
  skillName: string,
  characteristic: string,
): TooltipContent | null {
  const description = getSkillDescription(skillName);
  if (!description) return null;

  return {
    title: skillName,
    sections: [
      { label: 'Description', text: description },
      { label: 'Linked Characteristic', text: characteristic },
    ],
  };
}

/** Returns tooltip content for a condition, or null if not found */
export function resolveConditionTooltip(
  conditionName: string,
): TooltipContent | null {
  const condition = CONDITIONS.find((c) => c.name === conditionName);
  if (!condition) return null;

  return {
    title: condition.name,
    sections: [
      { label: 'Description', text: condition.description },
      { label: 'Effects', text: condition.effects },
      { label: 'Duration', text: condition.defaultDuration },
      { label: 'Removed By', text: condition.removedBy },
    ],
  };
}

/** Returns tooltip content for a talent, or null if no description available */
export function resolveTalentTooltip(
  talentName: string,
  characterDesc: string,
): TooltipContent | null {
  const dbEntry = TALENT_DB.find((t) => t.name === talentName);

  if (dbEntry) {
    return {
      title: dbEntry.name,
      sections: [
        { label: 'Description', text: dbEntry.desc },
        { label: 'Max', text: dbEntry.max },
      ],
    };
  }

  // Custom talent — fall back to character description
  if (characterDesc) {
    return {
      title: talentName,
      sections: [{ label: 'Description', text: characterDesc }],
    };
  }

  return null;
}
