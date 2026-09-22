import type { Dispatch, SetStateAction } from 'react';
import type { Character, Skill, Talent, SpellItem } from '../../types/character';
import { ADV_SKILL_DB } from '../../data/advanced-skills';
import { TALENT_DB } from '../../data/talents';
import { SPELL_LIST } from '../../data/spells';

/** Identifies a pending deletion target on the character sheet. */
export interface DeleteTarget {
  type: string;
  index: number;
}

interface UseCharacterEntitiesOptions {
  updateCharacter: (mutator: (char: Character) => Character) => void;
  deleteTarget: DeleteTarget | null;
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
  setShowAdvSkillPicker: Dispatch<SetStateAction<boolean>>;
  setShowTalentPicker: Dispatch<SetStateAction<boolean>>;
  setShowSpellPicker: Dispatch<SetStateAction<boolean>>;
  setExpandedSpells: Dispatch<SetStateAction<Set<number>>>;
}

/**
 * CRUD handlers for the character sheet's editable lists — advanced skills,
 * talents, spells — plus trapping worn/stored/backpack flags and the unified
 * delete dispatcher. Extracted from CharacterPage so that ~150 lines of highly
 * repetitive add/addCustom/update/remove logic live in one focused, testable
 * place. All mutations flow through `updateCharacter`; the picker/expand/delete
 * state setters are injected so this hook stays decoupled from the page's own
 * state declarations.
 */
export function useCharacterEntities({
  updateCharacter,
  deleteTarget,
  setDeleteTarget,
  setShowAdvSkillPicker,
  setShowTalentPicker,
  setShowSpellPicker,
  setExpandedSpells,
}: UseCharacterEntitiesOptions) {
  // ── Advanced skills ──────────────────────────────────────────────────────
  const addAdvancedSkillFromPicker = (skill: typeof ADV_SKILL_DB[number]) => {
    updateCharacter((c) => ({
      ...c,
      aSkills: [...c.aSkills, { n: skill.n, c: skill.c, a: 0 }],
    }));
    setShowAdvSkillPicker(false);
  };

  const addCustomAdvancedSkill = () => {
    updateCharacter((c) => ({
      ...c,
      aSkills: [...c.aSkills, { n: '', c: '', a: 0 }],
    }));
  };

  const updateAdvancedSkill = (index: number, field: keyof Skill, value: string | number) => {
    updateCharacter((c) => {
      const skills = [...c.aSkills];
      skills[index] = { ...skills[index], [field]: value };
      return { ...c, aSkills: skills };
    });
  };

  const removeAdvancedSkill = (index: number) => {
    updateCharacter((c) => ({
      ...c,
      aSkills: c.aSkills.filter((_, i) => i !== index),
    }));
    setDeleteTarget(null);
  };

  // ── Talents ──────────────────────────────────────────────────────────────
  const addTalentFromPicker = (talent: typeof TALENT_DB[number]) => {
    updateCharacter((c) => ({
      ...c,
      talents: [...c.talents, { n: talent.name, lvl: 1, desc: talent.desc }],
    }));
    setShowTalentPicker(false);
  };

  const addCustomTalent = () => {
    updateCharacter((c) => ({
      ...c,
      talents: [...c.talents, { n: '', lvl: 1, desc: '' }],
    }));
  };

  const updateTalent = (index: number, field: keyof Talent, value: string | number) => {
    updateCharacter((c) => {
      const talents = [...c.talents];
      talents[index] = { ...talents[index], [field]: value };
      return { ...c, talents };
    });
  };

  const removeTalent = (index: number) => {
    updateCharacter((c) => ({
      ...c,
      talents: c.talents.filter((_, i) => i !== index),
    }));
    setDeleteTarget(null);
  };

  // ── Spells ───────────────────────────────────────────────────────────────
  const addSpellFromPicker = (spell: typeof SPELL_LIST[number]) => {
    const item: SpellItem = { name: spell.name, cn: spell.cn, range: spell.range, target: spell.target, duration: spell.duration, effect: spell.effect };
    updateCharacter((c) => ({ ...c, spells: [...c.spells, item] }));
    setShowSpellPicker(false);
  };

  const addCustomSpell = () => {
    updateCharacter((c) => ({
      ...c,
      spells: [...c.spells, { name: '', cn: '0', range: '', target: '', duration: '', effect: '' }],
    }));
  };

  const updateSpell = (index: number, field: keyof SpellItem, value: string) => {
    updateCharacter((c) => {
      const spells = [...c.spells];
      spells[index] = { ...spells[index], [field]: value };
      return { ...c, spells };
    });
  };

  const removeSpell = (index: number) => {
    updateCharacter((c) => ({
      ...c,
      spells: c.spells.filter((_, i) => i !== index),
    }));
    setDeleteTarget(null);
  };

  const toggleSpellExpanded = (index: number) => {
    setExpandedSpells((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // ── Trapping flags (mutually exclusive; Core p.293 Worn Items) ─────────────
  // Req 6.1: setting worn=true clears storedOnHorse.
  const setWorn = (i: number, value: boolean) => {
    updateCharacter((c) => ({
      ...c,
      trappings: c.trappings.map((t, idx) =>
        idx === i ? { ...t, worn: value, storedOnHorse: value ? false : t.storedOnHorse } : t
      ),
    }));
  };

  // Req 6.2: setting storedOnHorse=true clears worn.
  const setStoredOnHorse = (i: number, value: boolean) => {
    updateCharacter((c) => ({
      ...c,
      trappings: c.trappings.map((t, idx) =>
        idx === i ? { ...t, storedOnHorse: value, worn: value ? false : t.worn } : t
      ),
    }));
  };

  // "In backpack" marker (house rule: ignoreBackpackEnc). A packed item is not
  // being worn and is not on the horse, so setting it clears both.
  const setInBackpack = (i: number, value: boolean) => {
    updateCharacter((c) => ({
      ...c,
      trappings: c.trappings.map((t, idx) =>
        idx === i ? { ...t, inBackpack: value, worn: value ? false : t.worn, storedOnHorse: value ? false : t.storedOnHorse } : t
      ),
    }));
  };

  // ── Unified delete dispatcher ──────────────────────────────────────────────
  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'aSkill') removeAdvancedSkill(deleteTarget.index);
    else if (deleteTarget.type === 'talent') removeTalent(deleteTarget.index);
    else if (deleteTarget.type === 'spell') removeSpell(deleteTarget.index);
    else if (deleteTarget.type === 'trapping') {
      updateCharacter((c) => ({ ...c, trappings: c.trappings.filter((_, i) => i !== deleteTarget.index) }));
      setDeleteTarget(null);
    }
  };

  return {
    addAdvancedSkillFromPicker,
    addCustomAdvancedSkill,
    updateAdvancedSkill,
    removeAdvancedSkill,
    addTalentFromPicker,
    addCustomTalent,
    updateTalent,
    removeTalent,
    addSpellFromPicker,
    addCustomSpell,
    updateSpell,
    removeSpell,
    toggleSpellExpanded,
    setWorn,
    setStoredOnHorse,
    setInBackpack,
    handleDelete,
  };
}
