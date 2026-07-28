import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Character, CharacteristicKey, ArmourPoints, Skill, Talent, SpellItem } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Picker } from '../shared/Picker';
import { SpellPicker } from '../shared/SpellPicker';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { RollHistoryPanel } from '../shared/RollHistoryPanel';
import { FortuneResolvePanel } from '../shared/FortuneResolvePanel';
import { CharacterPortrait } from '../shared/CharacterPortrait';
import { Toast } from '../shared/Toast';
import { Tooltip } from '../shared/Tooltip';
import { getPortraitStore } from '../../storage/portrait-store';
import { applySpeciesData } from '../../logic/species';
import { SPECIES_OPTIONS } from '../../data/species';
import { SPELL_LIST } from '../../data/spells';
import { ADV_SKILL_DB } from '../../data/advanced-skills';
import { TALENT_DB } from '../../data/talents';
import { TRAPPING_LIST } from '../../data/trappings';
import { CAREER_CLASS_LIST } from '../../data/careers';
import { getCareersByClass, getCareerScheme, getCareerSkills } from '../../logic/careers';
import { calculateMaxEncumbrance, calculateCoinWeight, computeWoundMaximum, calculateArmourPoints, getBonus } from '../../logic/calculators';
import { resolveSkillTooltip, resolveTalentTooltip } from '../../logic/tooltip-content';
import { computeSkillTarget, computeCharacteristicTarget, type RollResult } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import { User, Swords, BookOpen, Sparkles, Wand2, Brain, Package, Coins, Scale, Footprints, Hammer, Lock, Heart, Shield, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { CorruptionCard } from '../shared/CorruptionCard';
import { DiseasePanel } from '../shared/DiseasePanel';
import { EmptyState } from '../shared/EmptyState';
import { getRuneById } from '../../logic/runes';
import { RUNE_CATALOGUE } from '../../data/runes';
import { getRestrictedRunes, shouldApplyDeityFilter, isHighPriestLevel } from '../../logic/priestRunes';
import { activateRuneOfForging, resetForgingCharges, calculateForgingCharges } from '../../logic/engineeringRunes';
import { activateDoomRune } from '../../logic/doomRunes';
import { DeitySelector } from '../shared/DeitySelector';
import { GrudgePanel } from '../shared/GrudgePanel';
import { YenluiPanel } from '../shared/YenluiPanel';
import { isElf } from '../../logic/endeavours';
import { isDwarf } from '../../logic/grudges';
import { MagicalBurnoutPanel } from '../shared/MagicalBurnoutPanel';
import RunePanel from '../runes/RunePanel';
import type { ProtectionItem, EngineeringItem } from '../../types/character';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { SubTabBar } from '../shared/SubTabBar';
import { useTabOrder } from '../../hooks/useTabOrder';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import { CurrencyInput } from '../shared/CurrencyInput';
import { ConsumablesPanel } from '../shared/ConsumablesPanel';
import { PsychologyPanel } from '../shared/PsychologyPanel';
import { SessionNotesPanel } from '../shared/SessionNotesPanel';
import { applyCurrencyDelta } from '../../logic/currency';
import { filterSkills } from '../../logic/skill-filter';
import { SkillFilter } from '../shared/SkillFilter';
import styles from './CharacterPage.module.css';

interface CharacterPageProps {
  character: Character;
  characterId: string;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
  rollHistory?: RollHistoryEntry[];
  addRoll?: (result: RollResult) => void;
  clearHistory?: () => void;
  subTab?: string | null;
  onSubTabChange?: (tab: string) => void;
}

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const CHAR_FULL_NAMES: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness',
  I: 'Initiative', Ag: 'Agility', Dex: 'Dexterity', Int: 'Intelligence',
  WP: 'Willpower', Fel: 'Fellowship',
};

type CharSubTab = 'identity' | 'abilities' | 'gear' | 'notes';

export function CharacterPage({ character, characterId, update, updateCharacter, rollHistory = [], addRoll, clearHistory, subTab, onSubTabChange }: CharacterPageProps) {
  const VALID_SUBTABS: CharSubTab[] = ['identity', 'abilities', 'gear', 'notes'];
  const initialTab = (subTab && VALID_SUBTABS.includes(subTab as CharSubTab)) ? subTab as CharSubTab : 'identity';
  const [activeSubTab, setActiveSubTabInternal] = useState<CharSubTab>(initialTab);

  // Sync from external subTab prop (e.g. URL hash changes)
  // Falls back to default sub-tab if hash references a non-existent tab ID (Req 6.3)
  useEffect(() => {
    if (subTab) {
      if (VALID_SUBTABS.includes(subTab as CharSubTab)) {
        setActiveSubTabInternal(subTab as CharSubTab);
      } else {
        // Invalid tab ID in hash — fall back to default sub-tab
        setActiveSubTabInternal('identity');
      }
    }
  }, [subTab]);

  // Wrapper that notifies parent when sub-tab changes
  const setActiveSubTab = (tab: CharSubTab) => {
    setActiveSubTabInternal(tab);
    onSubTabChange?.(tab);
  };

  // Tab reordering
  const { orderedTabs, isEditMode, toggleEditMode, moveLeft, moveRight, resetOrder, isDefaultOrder, saveError } = useTabOrder({
    pageKey: 'character',
    defaultTabs: [
      { id: 'identity', label: 'Identity' },
      { id: 'abilities', label: 'Abilities' },
      { id: 'gear', label: 'Gear & Wealth' },
      { id: 'notes', label: 'Notes' },
    ],
  });

  // ─── Portrait state (stored in IndexedDB, NOT localStorage) ─────────────────
  const [portraitURL, setPortraitURL] = useState<string>('');
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const portraitURLRef = useRef<string>(portraitURL);

  // Keep ref in sync with state for cleanup
  useEffect(() => {
    portraitURLRef.current = portraitURL;
  }, [portraitURL]);

  // Load portrait URL from IndexedDB when characterId changes or component mounts
  useEffect(() => {
    let cancelled = false;
    const store = getPortraitStore();
    store.getPortraitURL(characterId).then((result) => {
      if (cancelled) return;
      if (result.ok && result.value) {
        setPortraitURL(result.value);
      } else {
        setPortraitURL('');
      }
    });
    return () => { cancelled = true; };
  }, [characterId]);

  // Object URL cleanup on unmount or when portrait changes
  useEffect(() => {
    return () => {
      if (portraitURLRef.current && portraitURLRef.current.startsWith('blob:')) {
        getPortraitStore().revokeURL(portraitURLRef.current);
      }
    };
  }, [portraitURL]);

  const handlePortraitUpload = useCallback(async (file: File) => {
    setPortraitError(null);
    const store = getPortraitStore();
    const result = await store.savePortrait(characterId, file);
    if (!result.ok) {
      setPortraitError('Portrait could not be saved.');
      return;
    }
    // Revoke old object URL if it was a blob URL
    if (portraitURLRef.current && portraitURLRef.current.startsWith('blob:')) {
      store.revokeURL(portraitURLRef.current);
    }
    // Get new object URL
    const urlResult = await store.getPortraitURL(characterId);
    if (urlResult.ok && urlResult.value) {
      setPortraitURL(urlResult.value);
    }
  }, [characterId]);

  const handlePortraitRemove = useCallback(async () => {
    setPortraitError(null);
    const store = getPortraitStore();
    const result = await store.deletePortrait(characterId);
    if (!result.ok) {
      setPortraitError('Portrait could not be removed.');
      return;
    }
    // Revoke old object URL if it was a blob URL
    if (portraitURLRef.current && portraitURLRef.current.startsWith('blob:')) {
      store.revokeURL(portraitURLRef.current);
    }
    setPortraitURL('');
  }, [characterId]);

  // Skill filter state (search + trained-only toggle)
  const [skillSearchText, setSkillSearchText] = useState('');
  const [skillTrainedOnly, setSkillTrainedOnly] = useState(() => {
    try { return localStorage.getItem('wfrp-hideUntrainedSkills') === 'true'; } catch { return false; }
  });

  // Persist trained-only preference to localStorage
  const handleTrainedOnlyChange = (enabled: boolean) => {
    setSkillTrainedOnly(enabled);
    try { localStorage.setItem('wfrp-hideUntrainedSkills', String(enabled)); } catch { /* ignore */ }
  };
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showAdvSkillPicker, setShowAdvSkillPicker] = useState(false);
  const [showTalentPicker, setShowTalentPicker] = useState(false);
  const [showTrappingPicker, setShowTrappingPicker] = useState(false);

  // Responsive characteristics table: hide T. Bonus on mobile by default (Req 7.3)
  const [showTBonus, setShowTBonus] = useState(false);

  const [expandedSpells, setExpandedSpells] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; index: number } | null>(null);
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);
  const [tooltip, setTooltip] = useState<{ type: 'skill' | 'talent'; index: number; anchorEl: HTMLElement } | null>(null);

  // Add dropdown menu state for Abilities tab (Req 9.4)
  const [addDropdown, setAddDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!addDropdown) return;
    const handleClick = () => setAddDropdown(null);
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [addDropdown]);

  const openCharacteristicRoll = (key: CharacteristicKey) => {
    const c = character.chars[key];
    const baseTarget = computeCharacteristicTarget(c.i, c.a, c.b);
    setRollDialogState({ name: CHAR_FULL_NAMES[key], baseTarget });
  };

  const openSkillRoll = (skill: Skill) => {
    const charVal = character.chars[skill.c as CharacteristicKey];
    const baseTarget = charVal
      ? computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a)
      : skill.a;
    setRollDialogState({ name: skill.n, baseTarget });
  };

  const handleRollResult = (result: RollResult) => {
    setRollDialogState(null);
    setRollResultState(result);
    addRoll?.(result);
  };

  const handleSpeciesChange = (species: string) => {
    if (species) {
      updateCharacter((c) => applySpeciesData(c, species));
    }
  };

  const handleClassChange = (cls: string) => {
    updateCharacter((c) => ({ ...c, class: cls, career: '', careerLevel: '', status: '' }));
  };

  const handleCareerChange = (career: string) => {
    const scheme = getCareerScheme(career);
    if (scheme) {
      updateCharacter((c) => ({
        ...c,
        career,
        class: scheme.class,
        careerLevel: scheme.level1.title,
        status: scheme.level1.status,
      }));
    }
  };

  const filteredCareers = character.class ? getCareersByClass(character.class) : [];

  // Career skill highlighting: compute the set of skills for the current career level
  const careerSkillSet = new Set(getCareerSkills(character.career, character.careerLevel));

  // Advanced skill CRUD
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

  // Talent CRUD
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

  // Spell CRUD
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

  return (
    <div className={styles.sectionGap}>
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={orderedTabs}
        activeTab={activeSubTab}
        onTabChange={(tab) => setActiveSubTab(tab as CharSubTab)}
        editMode={{
          isActive: isEditMode,
          onToggle: toggleEditMode,
          onMoveLeft: moveLeft,
          onMoveRight: moveRight,
          onReset: resetOrder,
          isDefaultOrder,
          saveError,
        }}
      />

      {/* ═══ IDENTITY TAB ═══ */}
      {activeSubTab === 'identity' && (<>
      {/* Portrait + Personal Details row */}
      <div className={styles.identityRow}>
        <CharacterPortrait
          portrait={portraitURL}
          characterName={character.name}
          onUpload={handlePortraitUpload}
          onRemove={handlePortraitRemove}
        />
        <Card style={{ flex: 1 }}>
          <SectionHeader icon={User} title="Personal Details" />
          <div className={styles.gridAutoFill}>
            <EditableField label="Name" value={character.name} onSave={(v) => update('name', v)} />
            <div className={styles.selectWrapper}>
              <span className={styles.selectLabel}>Species</span>
              <select
                value={character.species}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                className={styles.select}
              >
                <option value="">— Select Species —</option>
                {SPECIES_OPTIONS.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <span className={styles.selectLabel}>Class</span>
              <select value={character.class} onChange={(e) => handleClassChange(e.target.value)} className={styles.select}>
                <option value="">— Select Class —</option>
                {CAREER_CLASS_LIST.map((cls) => (<option key={cls} value={cls}>{cls}</option>))}
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <span className={styles.selectLabel}>Career</span>
              <select value={character.career} onChange={(e) => handleCareerChange(e.target.value)} className={styles.select}>
                <option value="">— Select Career —</option>
                {filteredCareers.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <EditableField label="Career Level" value={character.careerLevel} onSave={(v) => update('careerLevel', v)} />
            <EditableField label="Career Path" value={character.careerPath} onSave={(v) => update('careerPath', v)} />
            <div className={styles.fieldWithHelp}>
              <EditableField label="Status" value={character.status} onSave={(v) => update('status', v)} />
              <HelpPopover concept="status-tier">{getHelpContent('status-tier')}</HelpPopover>
            </div>
            <EditableField label="Age" value={character.age} onSave={(v) => update('age', v)} />
            <EditableField label="Height" value={character.height} onSave={(v) => update('height', v)} />
            <EditableField label="Hair" value={character.hair} onSave={(v) => update('hair', v)} />
            <EditableField label="Eyes" value={character.eyes} onSave={(v) => update('eyes', v)} />
          </div>
        </Card>
      </div>

      {/* Patron Deity — only visible for Dwarf priest characters */}
      <CollapsibleSection title="Patron Deity" storageKey="collapsible-deity-selector" defaultExpanded={true}>
        <DeitySelector character={character} updateCharacter={updateCharacter} />
      </CollapsibleSection>

      {/* Grudge Book — only visible for Dwarf characters (zero DOM otherwise per Req 8.5) */}
      {isDwarf(character.species) && (
        <CollapsibleSection title="Grudge Book" storageKey="collapsible-grudge-panel" defaultExpanded={true}>
          <GrudgePanel character={character} updateCharacter={updateCharacter} />
        </CollapsibleSection>
      )}

      {/* Yenlui Balance — only visible for Elf variants with useYenlui enabled (zero DOM otherwise per Req 8.6) */}
      {character.houseRules.useYenlui === true && isElf(character.species) && (
        <CollapsibleSection title="Yenlui Balance" storageKey="collapsible-yenlui-panel" defaultExpanded={true}>
          <div className={styles.fieldWithHelp}>
            <YenluiPanel character={character} updateCharacter={updateCharacter} />
            <HelpPopover concept="yenlui-balance">{getHelpContent('yenlui-balance')}</HelpPopover>
          </div>
        </CollapsibleSection>
      )}

      {/* Magical Burnout — only visible for High Magic users */}
      <CollapsibleSection title="Magical Burnout" storageKey="collapsible-magical-burnout" defaultExpanded={true}>
        <MagicalBurnoutPanel character={character} updateCharacter={updateCharacter} />
      </CollapsibleSection>

      {/* Characteristics */}
      <Card>
        <SectionHeader icon={Swords} title="Characteristics" />
        <button
          type="button"
          className={styles.showDetailsToggle}
          onClick={() => setShowTBonus((v) => !v)}
          aria-pressed={showTBonus}
        >
          {showTBonus ? 'Hide Details' : 'Show Details'}
        </button>
        <div className={styles.overflowAuto}>
          <table className={`${styles.tableBase} ${showTBonus ? styles.tBonusVisible : ''}`}>
            <thead>
              <tr>
                <th className={styles.thCenter} title="Characteristic">Char</th>
                <th className={styles.thCenter}>Initial</th>
                <th className={styles.thCenter} title="Advances">Advance</th>
                <th className={styles.thCenter}>Current</th>
                <th className={styles.thCB} title="Characteristic Bonus">CB</th>
                <th className={`${styles.thCenter} ${styles.tBonusCol}`} title="Talent Bonus">T. Bonus</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {CHAR_KEYS.map((key) => {
                const c = character.chars[key];
                const current = c.i + c.a + c.b;
                return (
                  <tr key={key}>
                    <td className={styles.charKey} title={CHAR_FULL_NAMES[key]}>{key}</td>
                    <td className={styles.tdCenter}>
                      <input type="number" value={c.i} onChange={(e) => update(`chars.${key}.i`, Number(e.target.value) || 0)} className={styles.numInput} />
                    </td>
                    <td className={styles.tdCenter}>
                      <input type="number" value={c.a} onChange={(e) => update(`chars.${key}.a`, Number(e.target.value) || 0)} className={styles.numInput} />
                    </td>
                    <td className={styles.charCurrent}>{current}</td>
                    <td className={styles.charCB}>{getBonus(current)}</td>
                    <td className={`${c.b > 0 ? styles.charBonusActive : styles.charBonusInactive} ${styles.tBonusCol}`}>{c.b || '—'}</td>
                    <td className={styles.tdCenter}>
                      <button type="button" className={styles.diceBtn} onClick={() => openCharacteristicRoll(key)} title={`Roll ${CHAR_FULL_NAMES[key]}`} aria-label={`Roll ${CHAR_FULL_NAMES[key]}`}>🎲</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Movement, Fortune/Resolve */}
      <div className={styles.movementFortuneGrid}>
        <Card>
          <SectionHeader icon={Footprints} title="Movement" />
          <div className={styles.movementFields}>
            <EditableField label="Move" value={character.move.m} type="number" onSave={(v) => update('move.m', v)} />
            <EditableField label="Walk" value={character.move.w} type="number" onSave={(v) => update('move.w', v)} />
            <EditableField label="Run" value={character.move.r} type="number" onSave={(v) => update('move.r', v)} />
          </div>
        </Card>
        <FortuneResolvePanel character={character} update={update} updateCharacter={updateCharacter} />
      </div>

      {/* Wound Maximum Formula */}
      <CollapsibleSection title="Wound Maximum" storageKey="collapsible-wound-max" defaultExpanded={true}>
      {(() => {
        const S = character.chars.S.i + character.chars.S.a + character.chars.S.b;
        const T = character.chars.T.i + character.chars.T.a + character.chars.T.b;
        const WP = character.chars.WP.i + character.chars.WP.a + character.chars.WP.b;
        const hardyTalent = character.talents.find(t => t.n === 'Hardy');
        const hardyLvl = hardyTalent ? hardyTalent.lvl : 0;
        const woundResult = computeWoundMaximum(S, T, WP, hardyLvl, character.woundsUseSB);
        const effectiveMax = character.eMaxOverride != null ? character.eMaxOverride : woundResult.total;

        const formulaParts: string[] = [];
        if (character.woundsUseSB) formulaParts.push(`SB ${woundResult.sb}`);
        formulaParts.push(`2×TB ${woundResult.tb}`);
        formulaParts.push(`WPB ${woundResult.wpb}`);
        if (hardyLvl > 0) formulaParts.push(`Hardy ${woundResult.hardy}`);

        return (
          <Card>
            <SectionHeader icon={Heart} title="Wound Maximum" />
            <div className={styles.woundFormulaSection}>
              <div className={styles.woundFormulaValue}>
                <span className={styles.woundFormulaTotal}>{effectiveMax}</span>
                {character.eMaxOverride != null && (
                  <span className={styles.woundFormulaOverride}>(override)</span>
                )}
              </div>
              <div className={styles.woundFormulaBreakdown}>
                {formulaParts.join(' + ')} = {woundResult.total}
              </div>
              {character.eMaxOverride != null && (
                <div className={styles.woundFormulaCalculated}>
                  Calculated: {woundResult.total}
                </div>
              )}
              <div className={styles.woundFormulaOverrideField}>
                <label className={styles.woundOverrideLabel}>
                  Override
                  <input
                    type="number"
                    value={character.eMaxOverride ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      update('eMaxOverride', val);
                    }}
                    placeholder="—"
                    className={styles.woundOverrideInput}
                  />
                </label>
              </div>
            </div>
          </Card>
        );
      })()}
      </CollapsibleSection>
      </>)}

      {/* ═══ ABILITIES TAB ═══ */}
      {activeSubTab === 'abilities' && (<>
      {/* Skill Filter */}
      <SkillFilter
        searchText={skillSearchText}
        trainedOnly={skillTrainedOnly}
        onSearchChange={setSkillSearchText}
        onTrainedOnlyChange={handleTrainedOnlyChange}
      />

      {/* Basic Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title="Basic Skills" />
        <table className={`${styles.tableBase} ${styles.skillTableCompact}`}>
          <thead>
            <tr>
              <th className={styles.th}>Skill</th>
              <th className={styles.thCenter} title="Linked Characteristic">Char</th>
              <th className={styles.thCenter} title="Advances">Adv</th>
              <th className={styles.thCenter} title="Characteristic + Advances">Total</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {filterSkills(character.bSkills, { searchText: skillSearchText, trainedOnly: skillTrainedOnly }).map((skill) => {
              const i = character.bSkills.indexOf(skill);
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
              const isCareerSkill = careerSkillSet.has(skill.n);
              const rowClass = isCareerSkill
                ? `${i % 2 === 0 ? styles.rowEven : styles.rowOdd} ${styles.careerSkillRow}`
                : (i % 2 === 0 ? styles.rowEven : styles.rowOdd);
              return (
                <tr key={i} className={rowClass}>
                  <td className={styles.td}>
                    <button
                      type="button"
                      className={styles.tooltipTriggerBtn}
                      aria-describedby={tooltip?.type === 'skill' && tooltip.index === i ? `tooltip-skill-${i}` : undefined}
                      onClick={(e) => {
                        if (tooltip?.type === 'skill' && tooltip.index === i) {
                          setTooltip(null);
                          return;
                        }
                        const content = resolveSkillTooltip(skill.n, skill.c);
                        if (content) {
                          setTooltip({ type: 'skill', index: i, anchorEl: e.currentTarget });
                        }
                      }}
                    >
                      {skill.n}
                    </button>
                  </td>
                  <td className={styles.skillCharCol} title={CHAR_FULL_NAMES[skill.c as CharacteristicKey] || skill.c}>{skill.c}</td>
                  <td className={styles.tdCenter}>
                    <input type="number" value={skill.a} onChange={(e) => update(`bSkills.${i}.a`, Number(e.target.value) || 0)} className={styles.numInput} />
                  </td>
                  <td className={styles.skillTotalCol}>{total}</td>
                  <td className={styles.tdCenter}>
                    <button type="button" className={styles.diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Advanced Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title={<>Advanced Skills{character.aSkills.length > 20 && <span className={styles.countBadge}>{character.aSkills.length}</span>}</>} action={
          <div className={styles.addDropdownWrapper}>
            <button
              type="button"
              className={styles.addDropdownBtn}
              onClick={() => setAddDropdown(addDropdown === 'advSkill' ? null : 'advSkill')}
              aria-expanded={addDropdown === 'advSkill'}
              aria-haspopup="true"
            >
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </button>
            {addDropdown === 'advSkill' && (
              <div className={styles.addDropdownMenu} role="menu">
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { setShowAdvSkillPicker(true); setAddDropdown(null); }}>Add from Rulebook</button>
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { addCustomAdvancedSkill(); setAddDropdown(null); }}>Add Custom</button>
              </div>
            )}
          </div>
        } />
        <table className={`${styles.tableBase} ${styles.skillTableCompact}`}>
          <thead>
            <tr>
              <th className={styles.th}>Skill</th>
              <th className={styles.thCenter} title="Linked Characteristic">Char</th>
              <th className={styles.thCenter} title="Advances">Adv</th>
              <th className={styles.thCenter} title="Characteristic + Advances">Total</th>
              <th className={styles.th}></th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {filterSkills(character.aSkills, { searchText: skillSearchText, trainedOnly: skillTrainedOnly }).map((skill) => {
              const i = character.aSkills.indexOf(skill);
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
              const isCareerSkill = careerSkillSet.has(skill.n);
              const rowClass = isCareerSkill
                ? `${i % 2 === 0 ? styles.rowEven : styles.rowOdd} ${styles.careerSkillRow}`
                : (i % 2 === 0 ? styles.rowEven : styles.rowOdd);
              return (
                <tr key={i} className={rowClass}>
                  <td className={styles.td}>
                    <div className={styles.inlineRow}>
                      <button
                        type="button"
                        className={styles.infoBtn}
                        aria-describedby={tooltip?.type === 'skill' && tooltip.index === character.bSkills.length + i ? `tooltip-skill-${character.bSkills.length + i}` : undefined}
                        aria-label={`Info for ${skill.n}`}
                        onClick={(e) => {
                          const idx = character.bSkills.length + i;
                          if (tooltip?.type === 'skill' && tooltip.index === idx) {
                            setTooltip(null);
                            return;
                          }
                          const content = resolveSkillTooltip(skill.n, skill.c);
                          if (content) {
                            setTooltip({ type: 'skill', index: idx, anchorEl: e.currentTarget });
                          }
                        }}
                      >
                        ℹ
                      </button>
                      <EditableField label="" value={skill.n} onSave={(v) => updateAdvancedSkill(i, 'n', String(v))} />
                    </div>
                  </td>
                  <td className={styles.tdCenter}>
                    <EditableField label="" value={skill.c} onSave={(v) => updateAdvancedSkill(i, 'c', String(v))} />
                  </td>
                  <td className={styles.tdCenter}>
                    <input type="number" value={skill.a} onChange={(e) => updateAdvancedSkill(i, 'a', Number(e.target.value) || 0)} className={styles.numInput} />
                  </td>
                  <td className={styles.skillTotalCol}>{total}</td>
                  <td className={styles.tdCenter}>
                    <button type="button" className={styles.diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                  </td>
                  <td className={styles.tdCenter}>
                    <button type="button" onClick={() => setDeleteTarget({ type: 'aSkill', index: i })} className={styles.deleteBtn}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Talents */}
      <Card>
        <SectionHeader icon={Sparkles} title="Talents" action={
          <div className={styles.addDropdownWrapper}>
            <button
              type="button"
              className={styles.addDropdownBtn}
              onClick={() => setAddDropdown(addDropdown === 'talent' ? null : 'talent')}
              aria-expanded={addDropdown === 'talent'}
              aria-haspopup="true"
            >
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </button>
            {addDropdown === 'talent' && (
              <div className={styles.addDropdownMenu} role="menu">
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { setShowTalentPicker(true); setAddDropdown(null); }}>Add from Rulebook</button>
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { addCustomTalent(); setAddDropdown(null); }}>Add Custom</button>
              </div>
            )}
          </div>
        } />
        {character.talents.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            heading="No Talents"
            description="No talents acquired yet — add one from the rulebook or create a custom talent."
            action={{ label: 'Add Talent', onClick: () => setShowTalentPicker(true) }}
          />
        ) : (
        <table className={styles.tableBase}>
          <thead>
            <tr>
              <th className={styles.th}>Talent</th>
              <th className={styles.th}>Lvl</th>
              <th className={styles.th}>Description</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {character.talents.map((t, i) => (
              <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.td}>
                  <div className={styles.inlineRow}>
                    <button
                      type="button"
                      className={styles.infoBtn}
                      aria-describedby={tooltip?.type === 'talent' && tooltip.index === i ? `tooltip-talent-${i}` : undefined}
                      aria-label={`Info for ${t.n}`}
                      onClick={(e) => {
                        if (tooltip?.type === 'talent' && tooltip.index === i) {
                          setTooltip(null);
                          return;
                        }
                        const content = resolveTalentTooltip(t.n, t.desc);
                        if (content) {
                          setTooltip({ type: 'talent', index: i, anchorEl: e.currentTarget });
                        }
                      }}
                    >
                      ℹ
                    </button>
                    <EditableField label="" value={t.n} onSave={(v) => updateTalent(i, 'n', String(v))} />
                  </div>
                </td>
                <td className={styles.td}>
                  <EditableField label="" value={t.lvl} type="number" onSave={(v) => updateTalent(i, 'lvl', Number(v))} style={{ minWidth: '40px' }} />
                </td>
                <td className={styles.td}>
                  <EditableField label="" value={t.desc} onSave={(v) => updateTalent(i, 'desc', String(v))} />
                </td>
                <td className={styles.td}>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'talent', index: i })} className={styles.deleteBtn}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>

      {/* Spells — only show if character has magic talents/skills, relevant career skills, or already has spells */}
      {(character.spells.length > 0 || character.talents.some(t =>
        t.n.includes('Magic') || t.n.includes('Pray') || t.n.includes('Invoke') || t.n.includes('Bless')
      ) || character.aSkills.some(s =>
        s.n.startsWith('Channelling') || s.n.startsWith('Language (Magick)') || s.n === 'Pray'
      ) || (() => {
        const careerSkills = getCareerSkills(character.career, character.careerLevel);
        return careerSkills.includes('Pray') || careerSkills.some(s => s.startsWith('Channelling'));
      })()) && (
      <Card>
        <SectionHeader icon={Wand2} title="Spells & Prayers" action={
          <div className={styles.addDropdownWrapper}>
            <button
              type="button"
              className={styles.addDropdownBtn}
              onClick={() => setAddDropdown(addDropdown === 'spell' ? null : 'spell')}
              aria-expanded={addDropdown === 'spell'}
              aria-haspopup="true"
            >
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </button>
            {addDropdown === 'spell' && (
              <div className={styles.addDropdownMenu} role="menu">
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { setShowSpellPicker(true); setAddDropdown(null); }}>Add from Rulebook</button>
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { addCustomSpell(); setAddDropdown(null); }}>Add Custom</button>
              </div>
            )}
          </div>
        } />
        <table className={styles.tableBase}>
          <thead>
            <tr>
              <th className={styles.th}></th>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>CN</th>
              <th className={styles.th}>Range</th>
              <th className={styles.th}>Duration</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {character.spells.map((s, i) => {
              const isExpanded = expandedSpells.has(i);
              return (
                <React.Fragment key={i}>
                  <tr className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td className={styles.td}>
                      <button
                        type="button"
                        className={styles.spellExpandBtn}
                        onClick={() => toggleSpellExpanded(i)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${s.name || 'spell'} effect`}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={14} aria-hidden="true" />
                        )}
                      </button>
                    </td>
                    <td className={styles.td}>
                      <EditableField label="" value={s.name} onSave={(v) => updateSpell(i, 'name', String(v))} />
                    </td>
                    <td className={styles.td}>{s.cn}</td>
                    <td className={styles.td}>{s.range}</td>
                    <td className={styles.td}>{s.duration}</td>
                    <td className={styles.td}>
                      <button type="button" onClick={() => setDeleteTarget({ type: 'spell', index: i })} className={styles.deleteBtn}>✕</button>
                    </td>
                  </tr>
                  {isExpanded && s.effect && (
                    <tr className={styles.spellEffectRow}>
                      <td colSpan={6} className={styles.spellEffectCell}>
                        <div className={styles.spellEffectText}>{s.effect}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>
      )}

      {/* Known Runes — only show if character has Rune Magic talent */}
      {character.talents.some(t => t.n === 'Rune Magic' || t.n === 'Master Rune Magic') && (
      <Card>
        <SectionHeader icon={Hammer} title="Known Runes" />
        {(character.knownRunes ?? []).length === 0 ? (
          <div className={styles.runesEmpty}>
            No runes learned yet. Learn runes on the Advancement page.
          </div>
        ) : (
          (() => {
            const knownRunes = character.knownRunes ?? [];
            const isHighPriest = isHighPriestLevel(character.career, character.careerLevel);
            const restrictedSet = shouldApplyDeityFilter(character)
              ? new Set(getRestrictedRunes(knownRunes, character.patronDeity, isHighPriest))
              : new Set<string>();
            return (
              <div className={styles.runesGrid}>
                {knownRunes.map((runeId) => {
                  const rune = getRuneById(runeId);
                  if (!rune) return null;
                  const isRestricted = restrictedSet.has(runeId);
                  return (
                    <div key={runeId} className={`${styles.runeBadge}${isRestricted ? ` ${styles.runeBadgeRestricted}` : ''}`}>
                      <span className={styles.runeNameRow}>
                        <span className={styles.runeName}>{rune.name}</span>
                        {rune.isMaster && <span className={styles.runeMaster}>★</span>}
                        {isRestricted && (
                          <span className={styles.runeRestrictedBadge} aria-label="Restricted rune">
                            <Lock size={10} aria-hidden="true" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </span>
                      <div className={styles.runeCategory}>{rune.category}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
        <div className={styles.runeCount}>
          {(character.knownRunes ?? []).length} / {RUNE_CATALOGUE.length} runes known
        </div>
      </Card>
      )}

      {/* Rune Panel — Protection, Engineering, Doom management */}
      {character.talents.some(t => t.n.startsWith('Rune Magic') || t.n.startsWith('Master Rune Magic')) && (
      <Card>
        <SectionHeader icon={Hammer} title="Rune Management" />
        <RunePanel
          knownRunes={character.knownRunes ?? []}
          protectionItems={character.protectionItems ?? []}
          engineeringItems={character.engineeringItems ?? []}
          doomRuneActivations={character.doomRuneActivations ?? []}
          forgingCharges={character.forgingCharges ?? {}}
          onAddProtectionItem={(item: ProtectionItem) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: [...(c.protectionItems ?? []), item],
            }));
          }}
          onEditProtectionItem={(item: ProtectionItem) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).map(i => i.id === item.id ? item : i),
            }));
          }}
          onRemoveProtectionItem={(itemId: string) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).filter(i => i.id !== itemId),
            }));
          }}
          onInscribeProtectionRune={(itemId: string, runeId: string) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: [...i.runes, runeId] } : i
              ),
            }));
          }}
          onRemoveProtectionRune={(itemId: string, runeIndex: number) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: i.runes.filter((_, idx) => idx !== runeIndex) } : i
              ),
            }));
          }}
          onAddEngineeringItem={(item: EngineeringItem) => {
            updateCharacter((c) => {
              const items = [...(c.engineeringItems ?? []), item];
              const charges = { ...(c.forgingCharges ?? {}), [item.id]: calculateForgingCharges(item) };
              return { ...c, engineeringItems: items, forgingCharges: charges };
            });
          }}
          onRemoveEngineeringItem={(itemId: string) => {
            updateCharacter((c) => {
              const charges = { ...(c.forgingCharges ?? {}) };
              delete charges[itemId];
              return {
                ...c,
                engineeringItems: (c.engineeringItems ?? []).filter(i => i.id !== itemId),
                forgingCharges: charges,
              };
            });
          }}
          onInscribeEngineeringRune={(itemId: string, runeId: string) => {
            updateCharacter((c) => {
              const items = (c.engineeringItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: [...i.runes, runeId] } : i
              );
              // Recalculate forging charges for the affected item
              const updatedItem = items.find(i => i.id === itemId);
              const charges = { ...(c.forgingCharges ?? {}) };
              if (updatedItem) {
                charges[itemId] = calculateForgingCharges(updatedItem);
              }
              return { ...c, engineeringItems: items, forgingCharges: charges };
            });
          }}
          onRemoveEngineeringRune={(itemId: string, runeIndex: number) => {
            updateCharacter((c) => {
              const items = (c.engineeringItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: i.runes.filter((_, idx) => idx !== runeIndex) } : i
              );
              // Recalculate forging charges for the affected item
              const updatedItem = items.find(i => i.id === itemId);
              const charges = { ...(c.forgingCharges ?? {}) };
              if (updatedItem) {
                charges[itemId] = calculateForgingCharges(updatedItem);
              }
              return { ...c, engineeringItems: items, forgingCharges: charges };
            });
          }}
          onActivateForging={(itemId: string) => {
            updateCharacter((c) => {
              const item = (c.engineeringItems ?? []).find(i => i.id === itemId);
              if (!item) return c;
              const result = activateRuneOfForging(item, c.forgingCharges ?? {});
              if (!result.success) return c;
              return { ...c, forgingCharges: result.updatedCharges };
            });
          }}
          onResetCharges={() => {
            updateCharacter((c) => ({
              ...c,
              forgingCharges: resetForgingCharges(c.engineeringItems ?? []),
            }));
          }}
          onActivateDoomRune={(runeId: string) => {
            updateCharacter((c) => {
              const result = activateDoomRune(runeId, c.doomRuneActivations ?? []);
              if (!result.success || !result.activation) return c;
              return {
                ...c,
                doomRuneActivations: [...(c.doomRuneActivations ?? []), result.activation],
              };
            });
          }}
        />
      </Card>
      )}
      </>)}

      {/* ═══ GEAR & WEALTH TAB ═══ */}
      {activeSubTab === 'gear' && (<>
      {/* Trappings */}
      <Card>
        <SectionHeader icon={Package} title="Trappings" action={
          <div className={styles.actionRow}>
            <AddButton label="Add from Rulebook" onClick={() => setShowTrappingPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, trappings: [...c.trappings, { name: '', enc: '0', quantity: 1 }] }))} />
          </div>
        } />
        {character.trappings.length === 0 ? (
          <EmptyState
            icon={Package}
            heading="No gear yet — add trappings"
            compact
            action={{ label: '+ Add', onClick: () => setShowTrappingPicker(true) }}
          />
        ) : (
          <div className={styles.trappingsGrid}>
            {character.trappings.map((t, i) => (
              <div key={i} className={t.storedOnHorse ? styles.trappingCardHorse : styles.trappingCard}>
                <div className={styles.trappingActions}>
                  <input
                    type="checkbox"
                    checked={!!t.storedOnHorse}
                    onChange={(e) => update(`trappings.${i}.storedOnHorse`, e.target.checked)}
                    title="Stored on horse"
                    aria-label="Stored on horse"
                    className={styles.trappingHorseCheckbox}
                  />
                  <button type="button" onClick={() => setDeleteTarget({ type: 'trapping', index: i })} className={styles.deleteBtn} aria-label="Remove trapping">✕</button>
                </div>
                <span className={styles.trappingName}>{t.name || '(unnamed)'}</span>
                <span className={styles.trappingMeta}>
                  Enc {t.enc || '0'} · Qty {t.quantity || 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AP Auto-Calculation */}
      {(() => {
        const computedAP = calculateArmourPoints(character.armour);
        const manualAP = character.ap;
        const locations: { key: 'head' | 'lArm' | 'rArm' | 'body' | 'lLeg' | 'rLeg'; computedKey: keyof typeof computedAP; label: string }[] = [
          { key: 'head', computedKey: 'head', label: 'Head' },
          { key: 'lArm', computedKey: 'lArm', label: 'L Arm' },
          { key: 'rArm', computedKey: 'rArm', label: 'R Arm' },
          { key: 'body', computedKey: 'body', label: 'Body' },
          { key: 'lLeg', computedKey: 'lLeg', label: 'L Leg' },
          { key: 'rLeg', computedKey: 'rLeg', label: 'R Leg' },
        ];
        const hasAnyDiscrepancy = locations.some(loc => manualAP[loc.key] !== computedAP[loc.computedKey]);

        return (
          <Card>
            <SectionHeader icon={Shield} title="Armour Points" action={
              <button
                type="button"
                className={styles.apSyncBtn}
                disabled={!hasAnyDiscrepancy}
                onClick={() => {
                  updateCharacter((c) => ({
                    ...c,
                    ap: {
                      ...c.ap,
                      head: computedAP.head,
                      lArm: computedAP.lArm,
                      rArm: computedAP.rArm,
                      body: computedAP.body,
                      lLeg: computedAP.lLeg,
                      rLeg: computedAP.rLeg,
                    },
                  }));
                }}
                title="Set manual AP values to match computed values from armour"
                aria-label="Sync AP to computed values"
              >
                Sync
              </button>
            } />
            <div className={styles.apGrid}>
              {locations.map(loc => {
                const manual = manualAP[loc.key];
                const computed = computedAP[loc.computedKey];
                const hasDiscrepancy = manual !== computed;
                return (
                  <div
                    key={loc.key}
                    className={hasDiscrepancy ? styles.apLocationCellDiscrepancy : styles.apLocationCell}
                    data-testid={`ap-location-${loc.key}`}
                  >
                    <span className={styles.apLocationLabel}>{loc.label}</span>
                    <div className={styles.apValues}>
                      <input
                        type="number"
                        value={manual}
                        onChange={(e) => update(`ap.${loc.key}`, Math.max(0, Number(e.target.value) || 0))}
                        className={styles.numInput}
                        aria-label={`${loc.label} AP`}
                        min={0}
                      />
                      <span className={hasDiscrepancy ? styles.apComputedValueDiscrepancy : styles.apComputedValue} title="Computed from worn armour">
                        ({computed})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Consumables */}
      <ConsumablesPanel character={character} updateCharacter={updateCharacter} />

      {/* Wealth & Encumbrance */}
      <Card>
        <div className={styles.wealthEncGrid}>
          <div>
            <SectionHeader icon={Coins} title="Wealth" />
            <EditableField label="Gold Crowns (GC)" value={character.wGC} type="number" mode="always-editable" onSave={(v) => update('wGC', v)} />
            <EditableField label="Silver Shillings (SS)" value={character.wSS} type="number" mode="always-editable" onSave={(v) => update('wSS', v)} />
            <EditableField label="Brass Pennies (D)" value={character.wD} type="number" mode="always-editable" onSave={(v) => update('wD', v)} />
            <CurrencyInput onSubmit={(delta) => {
              const current = { gc: character.wGC || 0, ss: character.wSS || 0, d: character.wD || 0 };
              const result = applyCurrencyDelta(current, delta);
              update('wGC', result.gc);
              update('wSS', result.ss);
              update('wD', result.d);
            }} />
          </div>
          <div>
            <SectionHeader icon={Scale} title="Encumbrance" />
            {(() => {
              const eW = character.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
              const eA = character.armour.reduce((s, a) => {
                const baseEnc = parseFloat(a.enc) || 0;
                // Per WFRP 4e rules: worn items have encumbrance reduced by 1 (min 0)
                const wornEnc = a.worn !== false ? Math.max(0, baseEnc - 1) : baseEnc;
                return s + wornEnc;
              }, 0);
              const eT = character.trappings.filter(t => !t.storedOnHorse).reduce((s, t) => s + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);
              const eHorse = character.trappings.filter(t => t.storedOnHorse).reduce((s, t) => s + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);
              const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
              const eTotal = eW + eA + eT + eCoin;
              const maxEnc = calculateMaxEncumbrance(character.chars, 0);
              const over = eTotal > maxEnc;
              return (
                <div className={styles.encBreakdown}>
                  <div className={styles.encRow}><span className={styles.encLabel}>Weapons</span><span>{eW}</span></div>
                  <div className={styles.encRow}><span className={styles.encLabel}>Armour</span><span>{eA}</span></div>
                  <div className={styles.encRow}><span className={styles.encLabel}>Trappings</span><span>{eT}</span></div>
                  <div className={styles.encRow}><span className={styles.encLabel}>Coins</span><span>{eCoin}</span></div>
                  <div className={styles.encTotalRow}>
                    <span className={over ? styles.encTotalOver : styles.encTotalNormal}>Total</span>
                    <span className={over ? styles.encTotalValueOver : styles.encTotalValueNormal}>{eTotal} / {maxEnc}</span>
                  </div>
                  {over && <div className={styles.overburdenedMsg}>⚠ Overburdened</div>}
                  {eHorse > 0 && (() => {
                    const packAnimal = character.companions.find(c => c.isPackAnimal);
                    const packName = packAnimal ? packAnimal.name || packAnimal.species : 'Pack Animal';
                    return (
                      <div className={styles.horseEncRow}>
                        <span className={styles.horseEncLabel}>🐴 {packName}</span>
                        <span className={styles.horseEncValue}>{eHorse}</span>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
      </>)}

      {/* ═══ NOTES TAB ═══ */}
      {activeSubTab === 'notes' && (<>
      {/* Psychology */}
      <Card>
        <SectionHeader icon={Brain} title="Psychology" />
        <textarea value={character.psych} onChange={(e) => update('psych', e.target.value)} placeholder="Phobias, animosities..." className={styles.textarea} />
      </Card>

      {/* Psychology Traits */}
      <PsychologyPanel character={character} updateCharacter={updateCharacter} />

      {/* Corruption & Mutation */}
      <CorruptionCard character={character} update={update} updateCharacter={updateCharacter} />

      {/* Diseases */}
      <DiseasePanel character={character} updateCharacter={updateCharacter} />

      {/* Session Notes */}
      <SessionNotesPanel character={character} updateCharacter={updateCharacter} />

      {/* Ambitions & Party */}
      <Card>
        <div className={styles.ambitionsGrid}>
          <div>
            <SectionHeader icon={BookOpen} title="Ambitions" />
            <EditableField label="Short-term" value={character.ambS} onSave={(v) => update('ambS', v)} />
            <EditableField label="Long-term" value={character.ambL} onSave={(v) => update('ambL', v)} />
          </div>
          <div>
            <SectionHeader icon={BookOpen} title="Party" />
            <EditableField label="Name" value={character.partyN} onSave={(v) => update('partyN', v)} />
            <EditableField label="Members" value={character.partyM} onSave={(v) => update('partyM', v)} />
          </div>
        </div>
      </Card>
      </>)}

      {/* Pickers */}
      {showAdvSkillPicker && (
        <Picker items={ADV_SKILL_DB} getLabel={(s) => s.n} getGroup={(s) => s.c} onSelect={addAdvancedSkillFromPicker} onClose={() => setShowAdvSkillPicker(false)} title="Select Advanced Skill" />
      )}
      {showTalentPicker && (
        <Picker items={TALENT_DB} getLabel={(t) => t.name} onSelect={addTalentFromPicker} onClose={() => setShowTalentPicker(false)} title="Select Talent" />
      )}
      {showSpellPicker && (
        <SpellPicker
          spells={SPELL_LIST}
          characterTalents={character.talents}
          knownSpellNames={new Set(character.spells.map(s => s.name))}
          onSelect={addSpellFromPicker}
          onClose={() => setShowSpellPicker(false)}
          title="Select Spell"
        />
      )}
      {showTrappingPicker && (
        <Picker items={TRAPPING_LIST} getLabel={(t) => `${t.name} (Enc ${t.enc})`} onSelect={(t) => { updateCharacter((c) => ({ ...c, trappings: [...c.trappings, { name: t.name, enc: t.enc, quantity: 1 }] })); setShowTrappingPicker(false); }} onClose={() => setShowTrappingPicker(false)} title="Select Trapping" />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Remove this ${deleteTarget.type === 'aSkill' ? 'advanced skill' : deleteTarget.type}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Remove"
        />
      )}

      {/* Roll History — only on Abilities sub-tab (Req 14.2) */}
      {activeSubTab === 'abilities' && (
        <RollHistoryPanel history={rollHistory} onClear={clearHistory ?? (() => {})} />
      )}

      {/* Roll Dialog */}
      {rollDialogState && (
        <RollDialog
          skillOrCharName={rollDialogState.name}
          baseTarget={rollDialogState.baseTarget}
          onRoll={handleRollResult}
          onClose={() => setRollDialogState(null)}
        />
      )}

      {/* Roll Result Display */}
      {rollResultState && (
        <RollResultDisplay
          result={rollResultState}
          onClose={() => setRollResultState(null)}
        />
      )}

      {/* Tooltip */}
      {tooltip && (() => {
        let content = null;
        let tooltipId = '';
        if (tooltip.type === 'skill') {
          // For advanced skills, index >= bSkills.length
          const isAdvanced = tooltip.index >= character.bSkills.length;
          const skill = isAdvanced
            ? character.aSkills[tooltip.index - character.bSkills.length]
            : character.bSkills[tooltip.index];
          if (skill) {
            content = resolveSkillTooltip(skill.n, skill.c);
          }
          tooltipId = `tooltip-skill-${tooltip.index}`;
        } else if (tooltip.type === 'talent') {
          const talent = character.talents[tooltip.index];
          if (talent) {
            content = resolveTalentTooltip(talent.n, talent.desc);
          }
          tooltipId = `tooltip-talent-${tooltip.index}`;
        }
        if (!content) return null;
        return (
          <Tooltip
            anchorEl={tooltip.anchorEl}
            title={content.title}
            onClose={() => setTooltip(null)}
            id={tooltipId}
          >
            {content.sections.map((s, idx) => (
              <div key={idx} className={idx < content!.sections.length - 1 ? styles.tooltipSection : styles.tooltipSectionLast}>
                <div className={styles.tooltipSectionLabel}>{s.label}</div>
                <div>{s.text}</div>
              </div>
            ))}
          </Tooltip>
        );
      })()}

      {/* Portrait error toast */}
      <Toast message={portraitError} duration={5000} />

      {/* Tab order save error toast */}
      <Toast message={saveError ? 'Tab order could not be saved' : null} duration={5000} />
    </div>
  );
}
