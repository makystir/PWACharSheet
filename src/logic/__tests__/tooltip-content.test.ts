import { describe, it, expect } from 'vitest';
import {
  resolveSkillTooltip,
  resolveConditionTooltip,
  resolveTalentTooltip,
} from '../tooltip-content';

describe('resolveSkillTooltip', () => {
  it('returns description and characteristic for a known basic skill', () => {
    const result = resolveSkillTooltip('Athletics', 'Ag');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Athletics');
    expect(result!.sections).toHaveLength(2);
    expect(result!.sections[0].label).toBe('Description');
    expect(result!.sections[0].text).toContain('Run, jump');
    expect(result!.sections[1].label).toBe('Linked Characteristic');
    expect(result!.sections[1].text).toBe('Ag');
  });

  it('resolves a grouped skill via prefix matching (e.g. "Lore (History)")', () => {
    const result = resolveSkillTooltip('Lore (History)', 'Int');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Lore (History)');
    expect(result!.sections[0].text).toContain('academic subject');
    expect(result!.sections[1].text).toBe('Int');
  });

  it('returns null for a grouped skill with no base key (e.g. "Melee (Cavalry)")', () => {
    // Melee has "Melee (Basic)" and "Melee ()" keys but no bare "Melee" key
    const result = resolveSkillTooltip('Melee (Cavalry)', 'WS');
    expect(result).toBeNull();
  });

  it('resolves exact match for "Melee (Basic)"', () => {
    const result = resolveSkillTooltip('Melee (Basic)', 'WS');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Melee (Basic)');
    expect(result!.sections[0].text).toContain('basic hand weapons');
  });

  it('returns null for an unknown skill with no description', () => {
    const result = resolveSkillTooltip('NonexistentSkill', 'WS');
    expect(result).toBeNull();
  });

  it('resolves a known advanced skill', () => {
    const result = resolveSkillTooltip('Heal', 'Int');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Heal');
    expect(result!.sections[0].text).toContain('wounds');
  });

  it('resolves a grouped advanced skill like "Language (Khazalid)"', () => {
    const result = resolveSkillTooltip('Language (Khazalid)', 'Int');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Language (Khazalid)');
    expect(result!.sections[0].text).toContain('foreign language');
  });
});

describe('resolveConditionTooltip', () => {
  it('returns all four sections for a known condition', () => {
    const result = resolveConditionTooltip('Bleeding');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Bleeding');
    expect(result!.sections).toHaveLength(4);
    expect(result!.sections[0].label).toBe('Description');
    expect(result!.sections[1].label).toBe('Effects');
    expect(result!.sections[2].label).toBe('Duration');
    expect(result!.sections[3].label).toBe('Removed By');
  });

  it('populates correct content for Bleeding', () => {
    const result = resolveConditionTooltip('Bleeding')!;
    expect(result.sections[0].text).toContain('bleeding profusely');
    expect(result.sections[1].text).toContain('Lose 1 Wound per level');
    expect(result.sections[2].text).toBe('Until healed');
    expect(result.sections[3].text).toContain('Heal test');
  });

  it('returns null for an unknown condition', () => {
    const result = resolveConditionTooltip('UnknownCondition');
    expect(result).toBeNull();
  });

  it('resolves Stunned condition correctly', () => {
    const result = resolveConditionTooltip('Stunned');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Stunned');
    expect(result!.sections[1].text).toContain('Move action');
  });
});

describe('resolveTalentTooltip', () => {
  it('returns DB description and max for a known talent', () => {
    const result = resolveTalentTooltip('Hardy', '');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Hardy');
    expect(result!.sections).toHaveLength(2);
    expect(result!.sections[0].label).toBe('Description');
    expect(result!.sections[0].text).toContain('Wounds permanently');
    expect(result!.sections[1].label).toBe('Max');
    expect(result!.sections[1].text).toBe('T Bonus');
  });

  it('returns character description for a custom talent not in DB', () => {
    const result = resolveTalentTooltip('CustomTalent', 'My custom desc');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('CustomTalent');
    expect(result!.sections).toHaveLength(1);
    expect(result!.sections[0].label).toBe('Description');
    expect(result!.sections[0].text).toBe('My custom desc');
  });

  it('returns null for a custom talent with empty description', () => {
    const result = resolveTalentTooltip('CustomTalent', '');
    expect(result).toBeNull();
  });

  it('prefers DB entry over character description', () => {
    const result = resolveTalentTooltip('Hardy', 'Some override');
    expect(result).not.toBeNull();
    expect(result!.sections[0].text).toContain('Wounds permanently');
  });
});
