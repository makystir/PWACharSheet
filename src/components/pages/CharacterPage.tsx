import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Character, CharacteristicKey, ArmourPoints, Skill, Talent, SpellItem, PsychologyTrait, PsychologyType } from '../../types/character';
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
import { SPECIES_OPTIONS, SPECIES_DATA } from '../../data/species';
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
import { User, Swords, BookOpen, Sparkles, Wand2, Package, Coins, Scale, Footprints, Hammer, Lock, Heart, Shield, ChevronDown, ChevronRight, Plus, Minimize2, Maximize2, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { CorruptionCard } from '../shared/CorruptionCard';
import { DiseasePanel } from '../shared/DiseasePanel';
import { EmptyState } from '../shared/EmptyState';
import { getRuneById } from '../../logic/runes';
import { RUNE_CATALOGUE } from '../../data/runes';
import { getRestrictedRunes, shouldApplyDeityFilter, isHighPriestLevel, isPriestCareer } from '../../logic/priestRunes';
import { isDwarfSpecies } from '../../logic/career-eligibility';
import { hasHighMagic } from '../../logic/magicalBurnout';
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
import { useCompactMode } from '../../hooks/useCompactMode';
import { saveLastSubTab, loadLastSubTab } from '../../logic/sub-tab-store';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import { CurrencyInput } from '../shared/CurrencyInput';
import { ConsumablesPanel } from '../shared/ConsumablesPanel';
import { UnifiedPsychologyPanel } from './UnifiedPsychologyPanel';
import { SessionNotesPanel } from '../shared/SessionNotesPanel';
import { applyCurrencyDelta } from '../../logic/currency';
import { filterSkills } from '../../logic/skill-filter';
import { SkillFilter } from '../shared/SkillFilter';
import { CharCurrentCell } from './CharCurrentCell';
import { CharBreakdownContent } from './CharBreakdownContent';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import { SkillBreakdownContent } from './SkillBreakdownContent';
import { CBBreakdownContent } from './CBBreakdownContent';
import { EncumbranceBreakdownContent } from './EncumbranceBreakdownContent';
import { CoinWeightBreakdownContent } from './CoinWeightBreakdownContent';
import { TrappingsBreakdownContent } from './TrappingsBreakdownContent';
import { getSkillBreakdown, getCBBreakdown, getEncumbranceBreakdown, getCoinWeightBreakdown, getTrappingEncBreakdown } from '../../logic/breakdown-helpers';
import { getContributingTalent } from '../../logic/talents';
import { AgeTierSelector } from '../shared/AgeTierSelector';
import { ProgressBar } from '../shared/ProgressBar';
import { getEncumbranceLevel, formatEncumbrance, calculateArmourEncumbrance, isWearableTrapping, calculateCarriedTrappingEnc, calculateHorseTrappingEnc } from '../../logic/encumbrance';
import { DragHandle } from '../shared/DragHandle';
import { AriaLiveAnnouncer } from '../shared/AriaLiveAnnouncer';
import { ContextualMenu } from '../shared/ContextualMenu';
import { useDragReorder } from '../../hooks/useDragReorder';
import { useLongPress } from '../../hooks/useLongPress';
import { reorderArray } from '../../logic/reorder';
import { DwarfAlternateRoll } from '../shared/DwarfAlternateRoll';
import {
  getSpeciesGroup,
  generateAge,
  generateHeight,
  humanHeightNeedsBonus,
  lookupEyeColour,
  lookupHairColour,
  getEyeColourOptions,
  getHairColourOptions,
  formatVariegatedEyes,
} from '../../logic/personal-details';
import type { HighElfAgeTier } from '../../data/personal-details';
import { AGE_FORMULAS, HEIGHT_FORMULAS } from '../../data/personal-details';
import styles from './CharacterPage.module.css';

/** Discriminated union for breakdown tooltips — only one open at a time. */
export type BreakdownTooltipState =
  | null
  | { type: 'skill'; index: number; anchorEl: HTMLElement }
  | { type: 'cb'; key: CharacteristicKey; anchorEl: HTMLElement }
  | { type: 'encumbrance'; anchorEl: HTMLElement }
  | { type: 'coinWeight'; anchorEl: HTMLElement }
  | { type: 'trappingEnc'; anchorEl: HTMLElement };

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

  // Compact/Expanded mode toggle (Req 9.1–9.5)
  const { mode: displayMode, toggle: toggleDisplayMode } = useCompactMode();

  // Active sub-tab: use URL hash > last stored > first ordered tab
  const resolveInitialTab = (): CharSubTab => {
    if (subTab && VALID_SUBTABS.includes(subTab as CharSubTab)) return subTab as CharSubTab;
    const stored = loadLastSubTab('character');
    if (stored && VALID_SUBTABS.includes(stored as CharSubTab)) return stored as CharSubTab;
    const firstOrdered = orderedTabs[0]?.id;
    if (firstOrdered && VALID_SUBTABS.includes(firstOrdered as CharSubTab)) return firstOrdered as CharSubTab;
    return 'identity';
  };
  const [activeSubTab, setActiveSubTabInternal] = useState<CharSubTab>(resolveInitialTab);

  // Sync from external subTab prop (e.g. URL hash changes)
  useEffect(() => {
    if (subTab) {
      if (VALID_SUBTABS.includes(subTab as CharSubTab)) {
        setActiveSubTabInternal(subTab as CharSubTab);
      }
    }
  }, [subTab]);

  // Wrapper that notifies parent and persists selection
  const setActiveSubTab = (tab: CharSubTab) => {
    setActiveSubTabInternal(tab);
    saveLastSubTab('character', tab);
    onSubTabChange?.(tab);
  };

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

  // Personal details: species group + state for random generation
  const speciesGroup = getSpeciesGroup(character.species);
  const allDetailsFilled = !!(character.age && character.height && character.hair && character.eyes);
  const [selectedAgeTier, setSelectedAgeTier] = useState<HighElfAgeTier | undefined>(undefined);
  const [firstEyeColour, setFirstEyeColour] = useState<string | null>(null);
  const [showSecondEyeRoll, setShowSecondEyeRoll] = useState(false);

  // Reset personal detail generation state when species changes (Req 9.6, 9.7, 12.4)
  // Dropdown options update automatically since they're derived from speciesGroup.
  // Free-text values (age, height, hair, eyes) are retained — not cleared here.
  const prevSpeciesRef = useRef(character.species);
  useEffect(() => {
    if (prevSpeciesRef.current !== character.species) {
      prevSpeciesRef.current = character.species;
      setFirstEyeColour(null);
      setShowSecondEyeRoll(false);
      setSelectedAgeTier(undefined);
    }
  }, [character.species]);

  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showAdvSkillPicker, setShowAdvSkillPicker] = useState(false);
  const [showTalentPicker, setShowTalentPicker] = useState(false);
  const [showTrappingPicker, setShowTrappingPicker] = useState(false);
  const [editingTrappingIndex, setEditingTrappingIndex] = useState<number | null>(null);

  // Drag-reorder for trappings grid
  const trappingsGridRef = useRef<HTMLDivElement>(null);
  const { dragState: trappingsDragState, getGripProps: getTrappingGripProps, getItemProps: getTrappingItemProps, dropIndicatorIndex: trappingsDropIndex, announcementText: trappingsAnnouncement } = useDragReorder({
    items: character.trappings,
    onReorder: (from, to) => updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, from, to) })),
    containerRef: trappingsGridRef,
  });

  // Long-press contextual menu for trappings
  const [trappingContextMenu, setTrappingContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);

  const handleTrappingLongPress = useCallback((e: TouchEvent) => {
    const target = (e.target as HTMLElement).closest('[data-trapping-index]') as HTMLElement | null;
    if (!target) return;
    const index = Number(target.dataset.trappingIndex);
    if (Number.isNaN(index)) return;
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    if (touch) {
      setTrappingContextMenu({ x: touch.clientX, y: touch.clientY, index });
    }
  }, []);

  const trappingLongPressHandlers = useLongPress({ onLongPress: handleTrappingLongPress });

  // Responsive characteristics table: hide T. Bonus on mobile by default (Req 7.3)
  const [showTBonus, setShowTBonus] = useState(false);

  const [expandedSpells, setExpandedSpells] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; index: number } | null>(null);
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);
  const [tooltip, setTooltip] = useState<{ type: 'skill' | 'talent'; index: number; anchorEl: HTMLElement } | null>(null);
  const [charTooltip, setCharTooltip] = useState<{ key: CharacteristicKey; anchorEl: HTMLElement } | null>(null);

  // Breakdown tooltip state — single-tooltip-at-a-time (Req 6.3)
  const [breakdownTooltip, setBreakdownTooltip] = useState<BreakdownTooltipState>(null);

  /** Open a breakdown tooltip, replacing any currently open one and dismissing the char current tooltip. */
  const openBreakdownTooltip = useCallback((state: NonNullable<BreakdownTooltipState>) => {
    setBreakdownTooltip(state);
    setCharTooltip(null);
  }, []);

  /** Close the active breakdown tooltip. */
  const closeBreakdownTooltip = useCallback(() => {
    setBreakdownTooltip(null);
  }, []);

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

  // Trapping worn / stored-on-horse mutual exclusivity (Core p.293 Worn Items).
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

      {/* Compact/Expanded Mode Toggle (Req 9.1) */}
      <div className={styles.compactToggleRow}>
        <button
          type="button"
          className={styles.compactToggleBtn}
          onClick={toggleDisplayMode}
          aria-pressed={displayMode === 'compact'}
          aria-label={displayMode === 'compact' ? 'Switch to expanded view' : 'Switch to compact view'}
          title={displayMode === 'compact' ? 'Expand details' : 'Compact view'}
        >
          {displayMode === 'compact' ? <Maximize2 size={16} aria-hidden="true" /> : <Minimize2 size={16} aria-hidden="true" />}
          <span>{displayMode === 'compact' ? 'Expand' : 'Compact'}</span>
        </button>
      </div>

      {/* ═══ COMPACT MODE SUMMARY (Req 9.2) ═══ */}
      {displayMode === 'compact' && (
        <div className={styles.compactSummary}>
          <div className={styles.compactHeader}>
            <span className={styles.compactName}>{character.name || '(Unnamed)'}</span>
            <span className={styles.compactMeta}>
              {[character.species, character.career].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className={styles.compactWounds}>
            <Heart size={14} aria-hidden="true" />
            <span>Wounds: <strong>{character.wCur}</strong> / {(() => {
              const S = character.chars.S.i + character.chars.S.a + character.chars.S.b;
              const T = character.chars.T.i + character.chars.T.a + character.chars.T.b;
              const WP = character.chars.WP.i + character.chars.WP.a + character.chars.WP.b;
              const hardyTalent = character.talents.find(t => t.n === 'Hardy');
              const hardyLvl = hardyTalent ? hardyTalent.lvl : 0;
              const speciesWoundData = character.species ? SPECIES_DATA[character.species] : undefined;
              const woundMult = speciesWoundData?.woundMultiplier ?? 1;
              const woundResult = computeWoundMaximum(S, T, WP, hardyLvl, character.woundsUseSB, woundMult);
              return character.eMaxOverride ?? woundResult.total;
            })()}</span>
          </div>
          <div className={styles.compactChars}>
            {CHAR_KEYS.map((key) => {
              const c = character.chars[key];
              const current = c.i + c.a + c.b;
              return (
                <div key={key} className={styles.compactCharCell}>
                  <span className={styles.compactCharLabel}>{key}</span>
                  <span className={styles.compactCharValue}>{current}</span>
                </div>
              );
            })}
          </div>
          {character.weapons.length > 0 && (
            <div className={styles.compactWeapons}>
              <Swords size={14} aria-hidden="true" />
              <span>
                {character.weapons
                  .filter(w => w.equipped !== false)
                  .map(w => w.name)
                  .filter(Boolean)
                  .join(', ') || 'No equipped weapons'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ EXPANDED MODE CONTENT — animated via grid-template-rows (Req 9.3, 9.5) ═══ */}
      <div className={styles.expandedContent} data-expanded={String(displayMode === 'expanded')}><div className={styles.expandedContentInner}>

      {/* ═══ TWO-COLUMN DESKTOP GRID (Req 22.1–22.5) ═══ */}
      <div className={styles.desktopGrid}>
      {/* ─── LEFT COLUMN: Characteristics + Biographical/Identity ─── */}
      <div className={`${styles.desktopGridLeft}${activeSubTab !== 'identity' ? ` ${styles.mobileHidden}` : ''}`}>
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

      {/* Generate Personal Details — collapsible panel with roll/dropdown controls */}
      {!allDetailsFilled && (
        <CollapsibleSection title="🎲 Generate Personal Details" storageKey="collapsible-generate-details" defaultExpanded={true}>
          <Card>
            <div className={styles.generateDetailsGrid}>
              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Age</span>
                {speciesGroup === 'High_Elf' && (
                  <AgeTierSelector onTierChange={(tier) => setSelectedAgeTier(tier)} />
                )}
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={() => {
                    if (!speciesGroup) return;
                    const tier = speciesGroup === 'High_Elf' ? selectedAgeTier : undefined;
                    const diceCount = tier ? tier.diceCount : AGE_FORMULAS[speciesGroup].diceCount;
                    const dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 10) + 1);
                    const age = generateAge(speciesGroup, dice, tier);
                    update('age', String(age));
                  }}
                  disabled={!character.species}
                  aria-label="Roll Age"
                >
                  🎲 Roll
                </button>
              </div>

              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Height</span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={() => {
                    if (!speciesGroup) return;
                    const diceCount = HEIGHT_FORMULAS[speciesGroup].diceCount;
                    const dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 10) + 1);
                    if (speciesGroup === 'Human') {
                      const needsBonus = humanHeightNeedsBonus(dice as [number, number]);
                      if (needsBonus) {
                        const bonusDie = Math.floor(Math.random() * 10) + 1;
                        update('height', generateHeight(speciesGroup, dice, bonusDie));
                      } else {
                        update('height', generateHeight(speciesGroup, dice));
                      }
                    } else {
                      update('height', generateHeight(speciesGroup, dice));
                    }
                  }}
                  disabled={!character.species}
                  aria-label="Roll Height"
                >
                  🎲 Roll
                </button>
              </div>

              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Hair</span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={() => {
                    if (!speciesGroup) return;
                    const dice = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10) + 1);
                    const roll = dice[0] + dice[1];
                    update('hair', lookupHairColour(speciesGroup, roll));
                  }}
                  disabled={!character.species}
                  aria-label="Roll Hair"
                >
                  🎲 Roll
                </button>
                {speciesGroup && (
                  <select
                    className={styles.generateSelect}
                    onChange={(e) => { update('hair', e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    disabled={!character.species}
                    aria-label="Select Hair"
                  >
                    <option value="" disabled>Select…</option>
                    {getHairColourOptions(speciesGroup).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Eyes</span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={() => {
                    if (!speciesGroup) return;
                    const dice = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10) + 1);
                    const roll = dice[0] + dice[1];
                    const eyeColour = lookupEyeColour(speciesGroup, roll);
                    update('eyes', eyeColour);
                    if (speciesGroup === 'High_Elf' || speciesGroup === 'Wood_Elf') {
                      setFirstEyeColour(eyeColour);
                      setShowSecondEyeRoll(true);
                    } else {
                      setFirstEyeColour(null);
                      setShowSecondEyeRoll(false);
                    }
                  }}
                  disabled={!character.species}
                  aria-label="Roll Eyes"
                >
                  🎲 Roll
                </button>
                {speciesGroup && (
                  <select
                    className={styles.generateSelect}
                    onChange={(e) => { update('eyes', e.target.value); e.target.value = ''; setFirstEyeColour(null); setShowSecondEyeRoll(false); }}
                    defaultValue=""
                    disabled={!character.species}
                    aria-label="Select Eyes"
                  >
                    <option value="" disabled>Select…</option>
                    {getEyeColourOptions(speciesGroup).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
                {showSecondEyeRoll && firstEyeColour && (speciesGroup === 'High_Elf' || speciesGroup === 'Wood_Elf') && (
                  <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={() => {
                      const dice = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10) + 1);
                      const roll = dice[0] + dice[1];
                      const secondColour = lookupEyeColour(speciesGroup, roll);
                      update('eyes', formatVariegatedEyes(firstEyeColour, secondColour));
                      setFirstEyeColour(null);
                      setShowSecondEyeRoll(false);
                    }}
                    aria-label="Roll Second Colour"
                  >
                    🎲 2nd Colour
                  </button>
                )}
              </div>

              {speciesGroup === 'Dwarf' && (
                <div className={styles.generateRow}>
                  <DwarfAlternateRoll
                    variant={character.species.replace(/^dwarfs?\s*/i, '').replace(/^\(|\)$/g, '')}
                    onHairUpdate={(hair) => update('hair', hair)}
                    onEyesUpdate={(eyes) => update('eyes', eyes)}
                    onFeatureUpdate={(feature) => update('distinguishingFeature', feature)}
                    disabled={!character.species}
                  />
                </div>
              )}
            </div>
          </Card>
        </CollapsibleSection>
      )}

      {/* Patron Deity — only visible for Dwarf priest characters */}
      {isDwarfSpecies(character.species) && isPriestCareer(character.career) && (
        <CollapsibleSection title="Patron Deity" storageKey="collapsible-deity-selector" defaultExpanded={true}>
          <DeitySelector character={character} updateCharacter={updateCharacter} />
        </CollapsibleSection>
      )}

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
      {hasHighMagic(character) && (
        <CollapsibleSection title="Magical Burnout" storageKey="collapsible-magical-burnout" defaultExpanded={true}>
          <MagicalBurnoutPanel character={character} updateCharacter={updateCharacter} />
        </CollapsibleSection>
      )}

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
          <div className={`${styles.charGrid}${showTBonus ? '' : ` ${styles.hideTBonus}`}`}>
            {/* Header */}
            <div className={styles.charGridHeader}>
              <span>Char</span>
              <span>Initial</span>
              <span>Advance</span>
              <span>Current</span>
              <span>CB</span>
              {showTBonus && <span>T. Bonus</span>}
              <span></span>
            </div>
            {/* Rows */}
            {CHAR_KEYS.map((key) => {
              const c = character.chars[key];
              const current = c.i + c.a + c.b;
              return (
                <div key={key} className={styles.charGridRow}>
                  <div className={styles.charGridKey} title={CHAR_FULL_NAMES[key]}>{key}</div>
                  <div>
                    <input type="number" value={c.i} onChange={(e) => update(`chars.${key}.i`, Number(e.target.value) || 0)} className={styles.numInput} />
                  </div>
                  <div>
                    <input type="number" value={c.a} onChange={(e) => update(`chars.${key}.a`, Number(e.target.value) || 0)} className={styles.numInput} />
                  </div>
                  <CharCurrentCell
                    charKey={key}
                    current={current}
                    isTooltipOpen={charTooltip?.key === key}
                    onOpen={(k, el) => { setCharTooltip({ key: k, anchorEl: el }); setBreakdownTooltip(null); }}
                    onClose={() => setCharTooltip(null)}
                  />
                  <TooltipTriggerCell
                    tooltipId={`tooltip-breakdown-cb-${key}`}
                    displayValue={getBonus(current)}
                    isTooltipOpen={breakdownTooltip?.type === 'cb' && breakdownTooltip.key === key}
                    onOpen={(anchorEl) => openBreakdownTooltip({ type: 'cb', key, anchorEl })}
                    onClose={closeBreakdownTooltip}
                    className={styles.charGridCB}
                    ariaLabel={`CB breakdown for ${CHAR_FULL_NAMES[key]}`}
                  />
                  {showTBonus && <div className={c.b > 0 ? styles.charGridBonusActive : styles.charGridBonusInactive}>{c.b || '—'}</div>}
                  <div>
                    <button type="button" className={styles.diceBtn} onClick={() => openCharacteristicRoll(key)} title={`Roll ${CHAR_FULL_NAMES[key]}`} aria-label={`Roll ${CHAR_FULL_NAMES[key]}`}>🎲</button>
                  </div>
                </div>
              );
            })}
          </div>
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
        const speciesWoundData = character.species ? SPECIES_DATA[character.species] : undefined;
        const woundMult = speciesWoundData?.woundMultiplier ?? 1;
        const woundResult = computeWoundMaximum(S, T, WP, hardyLvl, character.woundsUseSB, woundMult);
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

      {/* Psychology Tracker (Archives Vol. II) — only when enabled */}
      {character.houseRules.usePsychologyTracker && (
      <CollapsibleSection title="Psychology Tracker" storageKey="collapsible-psychology-tracker" defaultExpanded={true}>
        <UnifiedPsychologyPanel
          psychologyTraits={character.psychologyTraits ?? []}
          brokenTally={character.brokenTally ?? 0}
          wpValue={character.chars.WP.i + character.chars.WP.a + character.chars.WP.b}
          onAddTrait={(type, target, rating) => {
            const newTrait: PsychologyTrait = {
              id: crypto.randomUUID(),
              type: type as PsychologyType,
              target,
              rating,
            };
            updateCharacter((c) => ({
              ...c,
              psychologyTraits: [...(c.psychologyTraits ?? []), newTrait],
            }));
          }}
          onRemoveTrait={(id) => {
            updateCharacter((c) => ({
              ...c,
              psychologyTraits: (c.psychologyTraits ?? []).filter((t) => t.id !== id),
            }));
          }}
          onIncrementBrokenTally={() => {
            updateCharacter((c) => ({
              ...c,
              brokenTally: (c.brokenTally ?? 0) + 1,
            }));
          }}
        />
      </CollapsibleSection>
      )}
      </div>{/* end desktopGridLeft */}

      {/* ─── RIGHT COLUMN: Skills, Talents, Gear ─── */}
      <div className={`${styles.desktopGridRight}${activeSubTab !== 'abilities' && activeSubTab !== 'gear' ? ` ${styles.mobileHidden}` : ''}`}>
      {/* ═══ ABILITIES SECTION ═══ */}
      <div className={`${styles.abilitiesSection}${activeSubTab !== 'abilities' ? ` ${styles.mobileHidden}` : ''}`}>
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
        <div className={styles.skillGrid}>
          {/* Header */}
          <div className={styles.skillGridHeader}>
            <span>Skill</span>
            <span>Char</span>
            <span>Adv</span>
            <span>Total</span>
            <span></span>
          </div>
          {/* Rows */}
          {filterSkills(character.bSkills, { searchText: skillSearchText, trainedOnly: skillTrainedOnly }).map((skill) => {
            const i = character.bSkills.indexOf(skill);
            const charVal = character.chars[skill.c as CharacteristicKey];
            const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
            const isCareerSkill = careerSkillSet.has(skill.n);
            return (
              <div key={i} className={`${styles.skillGridRow}${isCareerSkill ? ` ${styles.skillGridRowCareer}` : ''}`}>
                <div className={styles.skillGridName}>
                  <div className={styles.inlineRow}>
                    <button
                      type="button"
                      className={styles.infoBtn}
                      aria-describedby={tooltip?.type === 'skill' && tooltip.index === i ? `tooltip-skill-${i}` : undefined}
                      aria-label={`Info for ${skill.n}`}
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
                      ℹ
                    </button>
                    <span className={styles.skillNameText}>{skill.n}</span>
                  </div>
                </div>
                <div className={styles.skillGridChar} title={CHAR_FULL_NAMES[skill.c as CharacteristicKey] || skill.c}>{skill.c}</div>
                <div>
                  <input type="number" value={skill.a} onChange={(e) => update(`bSkills.${i}.a`, Number(e.target.value) || 0)} className={styles.numInput} />
                </div>
                <TooltipTriggerCell
                  tooltipId={`tooltip-breakdown-skill-${i}`}
                  displayValue={total}
                  isTooltipOpen={breakdownTooltip?.type === 'skill' && breakdownTooltip.index === i}
                  onOpen={(anchorEl) => openBreakdownTooltip({ type: 'skill', index: i, anchorEl })}
                  onClose={closeBreakdownTooltip}
                  className={styles.skillGridTotal}
                  ariaLabel={`Skill total breakdown for ${skill.n}`}
                />
                <div>
                  <button type="button" className={styles.diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                </div>
              </div>
            );
          })}
        </div>
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
        <div className={styles.skillGridAdvanced}>
          {/* Header */}
          <div className={styles.skillGridHeader}>
            <span>Skill</span>
            <span>Char</span>
            <span>Adv</span>
            <span>Total</span>
            <span></span>
            <span></span>
          </div>
          {/* Rows */}
          {filterSkills(character.aSkills, { searchText: skillSearchText, trainedOnly: skillTrainedOnly }).map((skill) => {
            const i = character.aSkills.indexOf(skill);
            const charVal = character.chars[skill.c as CharacteristicKey];
            const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
            const isCareerSkill = careerSkillSet.has(skill.n);
            return (
              <div key={i} className={`${styles.skillGridRow}${isCareerSkill ? ` ${styles.skillGridRowCareer}` : ''}`}>
                <div className={styles.skillGridName}>
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
                </div>
                <div className={styles.skillGridChar}>
                  <EditableField label="" value={skill.c} onSave={(v) => updateAdvancedSkill(i, 'c', String(v))} />
                </div>
                <div>
                  <input type="number" value={skill.a} onChange={(e) => updateAdvancedSkill(i, 'a', Number(e.target.value) || 0)} className={styles.numInput} />
                </div>
                <TooltipTriggerCell
                  tooltipId={`tooltip-breakdown-skill-${character.bSkills.length + i}`}
                  displayValue={total}
                  isTooltipOpen={breakdownTooltip?.type === 'skill' && breakdownTooltip.index === character.bSkills.length + i}
                  onOpen={(anchorEl) => openBreakdownTooltip({ type: 'skill', index: character.bSkills.length + i, anchorEl })}
                  onClose={closeBreakdownTooltip}
                  className={styles.skillGridTotal}
                  ariaLabel={`Skill total breakdown for ${skill.n}`}
                />
                <div>
                  <button type="button" className={styles.diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                </div>
                <div>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'aSkill', index: i })} className={styles.deleteBtn}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
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
        {character.spells.length === 0 ? (
          <EmptyState
            icon={Wand2}
            heading="No Spells or Prayers"
            description="Add spells or prayers from the rulebook or create custom entries."
            action={{ label: 'Add Spell', onClick: () => setShowSpellPicker(true) }}
          />
        ) : (
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
        )}
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
      </div>{/* end abilitiesSection */}

      {/* ═══ GEAR & WEALTH ═══ */}
      <div className={`${styles.gearSection}${activeSubTab !== 'gear' ? ` ${styles.mobileHidden}` : ''}`}>
      {/* Encumbrance Indicator */}
      {(() => {
        const eW = character.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
        const eA = character.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
        const eT = calculateCarriedTrappingEnc(character.trappings);
        const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
        const currentEnc = eW + eA + eT + eCoin;
        const strongBackTalent = character.talents.find(t => t.n === 'Strong Back');
        const strongBackLevel = strongBackTalent ? strongBackTalent.lvl : 0;
        const maxEnc = calculateMaxEncumbrance(character.chars, strongBackLevel);
        const level = getEncumbranceLevel(currentEnc, maxEnc);
        const label = formatEncumbrance(currentEnc, maxEnc);
        return (
          <ProgressBar
            current={currentEnc}
            max={maxEnc}
            level={level}
            label={label}
            ariaLabel="Encumbrance progress"
          />
        );
      })()}
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
          <div className={styles.trappingsGrid} ref={trappingsGridRef}>
            {character.trappings.map((t, i) => (
              <div
                key={i}
                data-drag-item=""
                data-trapping-index={i}
                aria-grabbed={trappingsDragState.status === 'dragging' && trappingsDragState.dragIndex === i ? true : undefined}
                style={getTrappingItemProps(i).style}
                className={`${t.storedOnHorse ? styles.trappingCardHorse : styles.trappingCard}${trappingsDragState.status === 'dragging' && trappingsDragState.dragIndex === i ? ` ${styles.trappingDragging}` : ''}${trappingsDropIndex === i ? ` ${styles.trappingDropTarget}` : ''}`}
                onTouchStart={trappingLongPressHandlers.onTouchStart}
                onTouchEnd={trappingLongPressHandlers.onTouchEnd}
                onTouchMove={trappingLongPressHandlers.onTouchMove}
              >
                {editingTrappingIndex === i ? (
                  <div className={styles.trappingEditForm}>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => update(`trappings.${i}.name`, e.target.value)}
                      placeholder="Trapping name"
                      className={styles.trappingEditInput}
                      aria-label="Trapping name"
                    />
                    <div className={styles.trappingEditRow}>
                      <input
                        type="text"
                        value={t.enc}
                        onChange={(e) => update(`trappings.${i}.enc`, e.target.value)}
                        placeholder="Enc"
                        className={styles.trappingEditInputSmall}
                        aria-label="Encumbrance"
                      />
                      <input
                        type="number"
                        value={t.quantity || 1}
                        onChange={(e) => update(`trappings.${i}.quantity`, Math.max(1, Number(e.target.value) || 1))}
                        placeholder="Qty"
                        className={styles.trappingEditInputSmall}
                        aria-label="Quantity"
                        min={1}
                      />
                    </div>
                    <div className={styles.trappingEditRow}>
                      <input
                        type="checkbox"
                        checked={!!t.storedOnHorse}
                        onChange={(e) => setStoredOnHorse(i, e.target.checked)}
                        className={styles.trappingHorseCheckbox}
                        aria-label="Stored on horse"
                      />
                      <span className={styles.trappingEditLabel}>Stored on horse</span>
                    </div>
                    {/* Worn toggle — wearable trappings only (Core p.293 Worn Items). Req 2.4, 2.5, 8.1-8.3 */}
                    {isWearableTrapping(t.name) && (
                      <div className={styles.trappingEditRow}>
                        <input
                          type="checkbox"
                          checked={!!t.worn}
                          onChange={(e) => setWorn(i, e.target.checked)}
                          className={styles.trappingWornCheckbox}
                          aria-label={`Worn — reduces ${t.name || 'this trapping'}'s encumbrance by 1 per item (min 0)`}
                        />
                        <span className={styles.trappingEditLabel}>Worn</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className={styles.trappingEditDoneBtn}
                      onClick={() => setEditingTrappingIndex(null)}
                    >Done</button>
                  </div>
                ) : (
                  <>
                    <div className={styles.trappingActions}>
                      <DragHandle
                        onMoveUp={() => updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, i, i - 1) }))}
                        onMoveDown={() => updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, i, i + 1) }))}
                        isFirst={i === 0}
                        isLast={i === character.trappings.length - 1}
                        itemLabel={t.name || 'trapping'}
                        gripProps={getTrappingGripProps(i)}
                      />
                      <label
                        className={styles.horseIndicator}
                        aria-label="Stored on horse — does not count toward personal encumbrance"
                        title="Stored on horse — does not count toward personal encumbrance"
                      >
                        <input
                          type="checkbox"
                          checked={!!t.storedOnHorse}
                          onChange={(e) => setStoredOnHorse(i, e.target.checked)}
                          className={styles.trappingHorseCheckbox}
                          disabled={trappingsDragState.status === 'dragging'}
                        />
                        <span className={styles.horseIcon} aria-hidden="true">🐎</span>
                      </label>
                      {/* Worn toggle — wearable trappings only (Core p.293 Worn Items). Req 2.4, 2.5, 8.1-8.3 */}
                      {isWearableTrapping(t.name) && (
                        <label
                          className={styles.wornIndicator}
                          aria-label={`Worn — reduces ${t.name || 'this trapping'}'s encumbrance by 1 per item (min 0)`}
                          title="Worn — reduces encumbrance by 1 per item (min 0)"
                        >
                          <input
                            type="checkbox"
                            checked={!!t.worn}
                            onChange={(e) => setWorn(i, e.target.checked)}
                            className={styles.trappingWornCheckbox}
                            disabled={trappingsDragState.status === 'dragging'}
                          />
                          <span className={styles.wornIcon} aria-hidden="true">👕</span>
                        </label>
                      )}
                      <button type="button" onClick={() => setEditingTrappingIndex(i)} className={styles.trappingEditBtn} aria-label={`Edit ${t.name || 'trapping'}`} disabled={trappingsDragState.status === 'dragging'}>✎</button>
                      <button type="button" onClick={() => setDeleteTarget({ type: 'trapping', index: i })} className={styles.deleteBtn} aria-label="Remove trapping">✕</button>
                    </div>
                    <div className={styles.trappingInfo}>
                      <span className={styles.trappingName}>{t.name || '(unnamed)'}</span>
                      <span className={styles.trappingMeta}>
                        Enc {t.enc || '0'} · Qty {t.quantity || 1}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <AriaLiveAnnouncer message={trappingsAnnouncement} />

        {trappingContextMenu && (
          <ContextualMenu
            x={trappingContextMenu.x}
            y={trappingContextMenu.y}
            items={[
              {
                label: 'Edit',
                icon: Pencil,
                onAction: () => setEditingTrappingIndex(trappingContextMenu.index),
              },
              {
                label: 'Delete',
                icon: Trash2,
                onAction: () => setDeleteTarget({ type: 'trapping', index: trappingContextMenu.index }),
                destructive: true,
              },
              {
                label: 'Move',
                icon: ArrowUpDown,
                onAction: () => {
                  const idx = trappingContextMenu.index;
                  if (idx > 0) {
                    updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, idx, idx - 1) }));
                  } else if (idx < character.trappings.length - 1) {
                    updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, idx, idx + 1) }));
                  }
                },
              },
            ]}
            onDismiss={() => setTrappingContextMenu(null)}
          />
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
              const eA = character.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
              const eT = calculateCarriedTrappingEnc(character.trappings);
              const eHorse = calculateHorseTrappingEnc(character.trappings);
              const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
              const eTotal = eW + eA + eT + eCoin;
              const strongBackTalent = character.talents.find(t => t.n === 'Strong Back');
              const strongBackLevel = strongBackTalent ? strongBackTalent.lvl : 0;
              const sturdyTalent = character.talents.find(t => t.n === 'Sturdy');
              const sturdyLevel = sturdyTalent ? sturdyTalent.lvl : 0;
              const maxEnc = calculateMaxEncumbrance(character.chars, strongBackLevel);
              const over = eTotal > maxEnc;
              return (
                <div className={styles.encBreakdown}>
                  <div className={styles.encRow}><span className={styles.encLabel}>Weapons</span><span>{eW}</span></div>
                  <div className={styles.encRow}><span className={styles.encLabel}>Armour</span><span>{eA}</span></div>
                  <div className={styles.encRow}>
                    <span className={styles.encLabel}>Trappings</span>
                    <TooltipTriggerCell
                      tooltipId="tooltip-breakdown-trappingEnc"
                      displayValue={eT}
                      isTooltipOpen={breakdownTooltip?.type === 'trappingEnc'}
                      onOpen={(anchorEl) => openBreakdownTooltip({ type: 'trappingEnc', anchorEl })}
                      onClose={closeBreakdownTooltip}
                      ariaLabel="Trappings encumbrance breakdown"
                    />
                  </div>
                  <div className={styles.encRow}>
                    <span className={styles.encLabel}>Coins</span>
                    <TooltipTriggerCell
                      tooltipId="tooltip-breakdown-coinWeight"
                      displayValue={eCoin}
                      isTooltipOpen={breakdownTooltip?.type === 'coinWeight'}
                      onOpen={(anchorEl) => openBreakdownTooltip({ type: 'coinWeight', anchorEl })}
                      onClose={closeBreakdownTooltip}
                      ariaLabel="Coin weight breakdown"
                    />
                  </div>
                  <div className={styles.encTotalRow}>
                    <span className={over ? styles.encTotalOver : styles.encTotalNormal}>Total</span>
                    <span className={over ? styles.encTotalValueOver : styles.encTotalValueNormal}>{eTotal} / <TooltipTriggerCell
                      tooltipId="tooltip-breakdown-encumbrance"
                      displayValue={maxEnc}
                      isTooltipOpen={breakdownTooltip?.type === 'encumbrance'}
                      onOpen={(anchorEl) => openBreakdownTooltip({ type: 'encumbrance', anchorEl })}
                      onClose={closeBreakdownTooltip}
                      ariaLabel="Max encumbrance breakdown"
                    /></span>
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
      </div>{/* end gearSection */}
      </div>{/* end desktopGridRight */}
      </div>{/* end desktopGrid */}

      {/* ═══ NOTES TAB ═══ */}
      {activeSubTab === 'notes' && (<>
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

      {/* Corruption & Mutation */}
      <CorruptionCard character={character} update={update} updateCharacter={updateCharacter} />

      {/* Diseases */}
      <DiseasePanel character={character} updateCharacter={updateCharacter} />

      {/* Session Notes */}
      <SessionNotesPanel character={character} updateCharacter={updateCharacter} />
      </>)}
      </div>{/* end expandedContentInner */}</div>{/* end expandedContent */}

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

      {/* Characteristic Breakdown Tooltip */}
      {charTooltip && (() => {
        const c = character.chars[charTooltip.key];
        const current = c.i + c.a + c.b;
        const contributingTalentName = getContributingTalent(character.talents, charTooltip.key);
        return (
          <Tooltip
            anchorEl={charTooltip.anchorEl}
            title={CHAR_FULL_NAMES[charTooltip.key]}
            onClose={() => setCharTooltip(null)}
            id={`tooltip-char-${charTooltip.key}`}
          >
            <CharBreakdownContent
              charKey={charTooltip.key}
              initial={c.i}
              advances={c.a}
              talentBonus={c.b}
              current={current}
              contributingTalentName={contributingTalentName}
            />
          </Tooltip>
        );
      })()}

      {/* Breakdown Tooltips (Skill, CB, Encumbrance, Coin Weight) */}
      {breakdownTooltip?.type === 'skill' && (() => {
        const isAdvanced = breakdownTooltip.index >= character.bSkills.length;
        const skill = isAdvanced
          ? character.aSkills[breakdownTooltip.index - character.bSkills.length]
          : character.bSkills[breakdownTooltip.index];
        if (!skill) return null;
        const breakdown = getSkillBreakdown(skill.c as CharacteristicKey, character.chars, skill.a);
        return (
          <Tooltip
            anchorEl={breakdownTooltip.anchorEl}
            title={`${skill.n} Breakdown`}
            onClose={closeBreakdownTooltip}
            id={`tooltip-breakdown-skill-${breakdownTooltip.index}`}
          >
            <SkillBreakdownContent {...breakdown} />
          </Tooltip>
        );
      })()}

      {breakdownTooltip?.type === 'cb' && (() => {
        const breakdown = getCBBreakdown(breakdownTooltip.key, character.chars);
        return (
          <Tooltip
            anchorEl={breakdownTooltip.anchorEl}
            title={`${CHAR_FULL_NAMES[breakdownTooltip.key]} CB`}
            onClose={closeBreakdownTooltip}
            id={`tooltip-breakdown-cb-${breakdownTooltip.key}`}
          >
            <CBBreakdownContent {...breakdown} />
          </Tooltip>
        );
      })()}

      {breakdownTooltip?.type === 'encumbrance' && (() => {
        const strongBackTalent = character.talents.find(t => t.n === 'Strong Back');
        const strongBackLevel = strongBackTalent ? strongBackTalent.lvl : 0;
        const sturdyTalent = character.talents.find(t => t.n === 'Sturdy');
        const sturdyLevel = sturdyTalent ? sturdyTalent.lvl : 0;
        const breakdown = getEncumbranceBreakdown(character.chars, strongBackLevel, sturdyLevel);
        return (
          <Tooltip
            anchorEl={breakdownTooltip.anchorEl}
            title="Max Encumbrance Breakdown"
            onClose={closeBreakdownTooltip}
            id="tooltip-breakdown-encumbrance"
          >
            <EncumbranceBreakdownContent {...breakdown} />
          </Tooltip>
        );
      })()}

      {breakdownTooltip?.type === 'coinWeight' && (() => {
        const breakdown = getCoinWeightBreakdown(character.wGC || 0, character.wSS || 0, character.wD || 0);
        return (
          <Tooltip
            anchorEl={breakdownTooltip.anchorEl}
            title="Coin Weight Breakdown"
            onClose={closeBreakdownTooltip}
            id="tooltip-breakdown-coinWeight"
          >
            <CoinWeightBreakdownContent {...breakdown} />
          </Tooltip>
        );
      })()}

      {breakdownTooltip?.type === 'trappingEnc' && (() => {
        const breakdown = getTrappingEncBreakdown(character.trappings);
        return (
          <Tooltip
            anchorEl={breakdownTooltip.anchorEl}
            title="Trappings Encumbrance"
            onClose={closeBreakdownTooltip}
            id="tooltip-breakdown-trappingEnc"
          >
            <TrappingsBreakdownContent {...breakdown} />
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
