import { useState, useEffect, useRef, useCallback } from 'react';
import type { Character, CharacteristicKey, ArmourPoints, Skill, PsychologyTrait, PsychologyType, FieldPath, FieldValue } from '../../types/character';
import { Picker } from '../shared/Picker';
import { SpellPicker } from '../shared/SpellPicker';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { RollHistoryPanel } from '../shared/RollHistoryPanel';
import { Toast } from '../shared/Toast';
import { Tooltip } from '../shared/Tooltip';
import { usePortrait } from '../../hooks/usePortrait';
import { applySpeciesData } from '../../logic/species';
import { SPELL_LIST } from '../../data/spells';
import { ADV_SKILL_DB } from '../../data/advanced-skills';
import { TALENT_DB } from '../../data/talents';
import { TRAPPING_LIST } from '../../data/trappings';
import { getCareersByClass, getCareerScheme, getCareerSkills, getSpecialisationOptions } from '../../logic/careers';
import { sortSkillsByCareerStatus } from '../../logic/advancement';
import { parseGroupedName, specialiseName } from '../../logic/grouped-names';
import { resolveSkillTooltip, resolveTalentTooltip } from '../../logic/tooltip-content';
import { computeSkillTarget, computeCharacteristicTarget, type RollResult } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import { Minimize2, Maximize2 } from 'lucide-react';

import { GettingStartedCard } from '../shared/GettingStartedCard';
import { isPriestCareer } from '../../logic/priestRunes';
import { isDwarfSpecies } from '../../logic/career-eligibility';
import { hasHighMagic } from '../../logic/magicalBurnout';
import { DeitySelector } from '../shared/DeitySelector';
import { GrudgePanel } from '../shared/GrudgePanel';
import { YenluiPanel } from '../shared/YenluiPanel';
import { isElf } from '../../logic/endeavours';
import { isDwarf } from '../../logic/grudges';
import { MagicalBurnoutPanel } from '../shared/MagicalBurnoutPanel';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { SubTabBar } from '../shared/SubTabBar';
import { useTabOrder } from '../../hooks/useTabOrder';
import { useCompactMode } from '../../hooks/useCompactMode';
import { saveLastSubTab, loadLastSubTab } from '../../logic/sub-tab-store';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import { UnifiedPsychologyPanel } from './UnifiedPsychologyPanel';

import { CharBreakdownContent } from './CharBreakdownContent';
import { getContributingTalent } from '../../logic/talents';
import { useDragReorder } from '../../hooks/useDragReorder';
import { useLongPress } from '../../hooks/useLongPress';
import { reorderArray } from '../../logic/reorder';
import { CHAR_FULL_NAMES } from './characterConstants';
import { CharacterBreakdownTooltips, type BreakdownTooltipState } from './CharacterBreakdownTooltips';
import { useCharacterEntities, type DeleteTarget } from './useCharacterEntities';
import { type SheetTooltipState } from './SheetInfoButton';
import { CompactSummary } from './character/CompactSummary';
import { AbilitiesTab, type SpecTarget } from './character/AbilitiesTab';
import { GearTab } from './character/GearTab';
import { PersonalDetailsSection } from './character/PersonalDetailsSection';
import { CharacteristicsSection } from './character/CharacteristicsSection';
import { NotesTab } from './character/NotesTab';
import { useWealthTransfer } from './character/useWealthTransfer';
import styles from './CharacterPage.module.css';

interface CharacterPageProps {
  character: Character;
  characterId: string;
  /**
   * Typed single-field update: the path is compile-time-checked against
   * `Character` (`FieldPath<Character>`) and the value type is inferred from the
   * addressed leaf (`FieldValue<Character, P>`) â€” invalid paths or mismatched
   * value types now fail `tsc` (spec: state-safety-core, Req 1.3/2.1). Mirrors
   * the narrowed `useCharacter().update` surface.
   */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
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

type CharSubTab = 'identity' | 'abilities' | 'gear' | 'notes';

// Module-level constant so it has a stable identity across renders (keeps it
// out of effect dependency arrays).
const VALID_SUBTABS: CharSubTab[] = ['identity', 'abilities', 'gear', 'notes'];

export function CharacterPage({ character, characterId, update, updateCharacter, rollHistory = [], addRoll, clearHistory, subTab, onSubTabChange }: CharacterPageProps) {

  // Tab reordering
  const { orderedTabs, isEditMode, toggleEditMode, moveLeft, moveRight, resetOrder, isDefaultOrder, saveError } = useTabOrder({
    pageKey: 'character',
    defaultTabs: [
      { id: 'identity', label: 'Identity' },
      { id: 'abilities', label: 'Abilities' },
      { id: 'gear', label: 'Gear' },
      { id: 'notes', label: 'Notes' },
    ],
  });

  // Compact/Expanded mode toggle (Req 9.1â€“9.5)
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

  // Sync from external subTab prop (e.g. URL hash changes).
  // Intentional setState-in-effect: this mirrors an external routing input
  // (the subTab prop) into local state. It is genuine external-system sync,
  // not derived state, because the tab is otherwise user-controlled locally.
  useEffect(() => {
    if (subTab) {
      if (VALID_SUBTABS.includes(subTab as CharSubTab)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // â”€â”€â”€ Portrait (stored in IndexedDB, NOT localStorage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const {
    portraitURL,
    portraitError,
    uploadPortrait: handlePortraitUpload,
    removePortrait: handlePortraitRemove,
  } = usePortrait(characterId);

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

  // Wealth â†’ Treasury deposit: extracted into a focused hook (spec:
  // character-page-decomposition, Req 2.1, seam h). The `depositError` inline-
  // error state and the `applyTransfer` deposit handler live in the hook now;
  // the shell just consumes the result and feeds the existing TransferControl
  // JSX. The applyTransfer mutation body is copied VERBATIM inside the hook â€”
  // no mutation-logic change (Req 8.4, state-safety / wealth-treasury-transfer).
  const { applyTransfer, depositError } = useWealthTransfer({ character, updateCharacter });

  // Personal details (Portrait + Personal Details card + Generate panel) are
  // now owned by PersonalDetailsSection (spec: character-page-decomposition,
  // seam b). That unit consumes `usePersonalDetailsGeneration` internally, so
  // the shell no longer wires the generation trio/handlers here; it only passes
  // the typed `update`, portrait props, and the species/class/career handlers +
  // `filteredCareers` (Lifted_State the shell still owns).

  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showAdvSkillPicker, setShowAdvSkillPicker] = useState(false);
  const [showTalentPicker, setShowTalentPicker] = useState(false);
  // Placeholder skill/talent row ("Language (Any)") whose specialisation is being chosen.
  const [specTarget, setSpecTarget] = useState<SpecTarget | null>(null);
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

  const [expandedSpells, setExpandedSpells] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);
  const [tooltip, setTooltip] = useState<SheetTooltipState | null>(null);
  const [charTooltip, setCharTooltip] = useState<{ key: CharacteristicKey; anchorEl: HTMLElement } | null>(null);

  // Breakdown tooltip state â€” single-tooltip-at-a-time (Req 6.3)
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
    if (scheme?.level1) {
      const level1 = scheme.level1;
      updateCharacter((c) => ({
        ...c,
        career,
        class: scheme.class,
        careerLevel: level1.title,
        status: level1.status,
      }));
    }
  };

  const filteredCareers = character.class ? getCareersByClass(character.class) : [];

  // Career skill highlighting: the character's skills that count as career skills
  // at the current level. Reuses the Advancement page's in-career test, so a
  // filled-in grouped skill ("Language (Bretonnian)" for "Language (Any)") stays marked.
  const careerSkillSet = new Set(
    sortSkillsByCareerStatus(character.bSkills, character.aSkills, getCareerSkills(character.career, character.careerLevel))
      .filter((entry) => entry.inCareer)
      .map((entry) => entry.skill.n)
  );

  // Advanced skill CRUD. The full hook result is captured as `entities` so it
  // can be injected into AbilitiesTab (spec: character-page-decomposition,
  // seam e â€” Req 5.3: setters injected, not re-declared). The individual
  // handlers the shell itself still wires (pickers, trapping flags, delete
  // dispatcher) are destructured from the same result.
  const entities = useCharacterEntities({
    updateCharacter,
    deleteTarget,
    setDeleteTarget,
    setShowAdvSkillPicker,
    setShowTalentPicker,
    setShowSpellPicker,
    setExpandedSpells,
  });
  const {
    addAdvancedSkillFromPicker,
    updateAdvancedSkill,
    addTalentFromPicker,
    updateTalent,
    addSpellFromPicker,
    handleDelete,
  } = entities;

  // Specialisation picker for a placeholder row. The options are suggestions
  // drawn from the game data; a custom specialisation can always be typed.
  const specTargetNames = specTarget?.type === 'aSkill'
    ? [...character.bSkills, ...character.aSkills].map((s) => s.n)
    : character.talents.map((t) => t.n);
  const specTargetName = specTarget
    ? (specTarget.type === 'aSkill' ? character.aSkills[specTarget.index]?.n : character.talents[specTarget.index]?.n)
    : undefined;
  const specOptions = specTarget && specTargetName !== undefined
    ? getSpecialisationOptions(specTargetName, specTarget.type === 'aSkill' ? 'skill' : 'talent')
    : null;
  const isNameOnSheet = (name: string) => specTargetNames.some((n) => n.toLowerCase() === name.toLowerCase());
  const handleChooseSpecialisation = (name: string) => {
    if (specTarget && !isNameOnSheet(name)) {
      if (specTarget.type === 'aSkill') updateAdvancedSkill(specTarget.index, 'n', name);
      else updateTalent(specTarget.index, 'n', name);
    }
    setSpecTarget(null);
  };

  return (
    <div className={styles.sectionGap}>
      {/* New-character onboarding card (spec: ux-audit-improvements, Req 5).
          Renders only for a brand-new character and self-hides once dismissed. */}
      <GettingStartedCard
        characterId={characterId}
        xpSpent={character.xpSpent}
        career={character.career}
        onSetup={() => setActiveSubTab('identity')}
        onRollTest={() => openCharacteristicRoll('WS')}
        onOpenCombat={() => { window.location.hash = '#combat'; }}
        nameSet={character.name.trim() !== ''}
        hasCharacteristics={Object.values(character.chars).some((c) => c.i > 0)}
        careerSet={character.career.trim() !== ''}
      />

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

      {/* â•â•â• COMPACT MODE SUMMARY (Req 9.2) â•â•â• */}
      {displayMode === 'compact' && <CompactSummary character={character} />}

      {/* â•â•â• EXPANDED MODE CONTENT â€” animated via grid-template-rows (Req 9.3, 9.5) â•â•â• */}
      <div className={styles.expandedContent} data-expanded={String(displayMode === 'expanded')}><div className={styles.expandedContentInner}>

      {/* â•â•â• TWO-COLUMN DESKTOP GRID (Req 22.1â€“22.5) â•â•â• */}
      <div className={styles.desktopGrid}>
      {/* â”€â”€â”€ LEFT COLUMN: Characteristics + Biographical/Identity â”€â”€â”€ */}
      <div className={`${styles.desktopGridLeft}${activeSubTab !== 'identity' ? ` ${styles.mobileHidden}` : ''}`}>
      {/* Portrait + Personal Details card + Generate panel extracted into a
          focused unit (spec: character-page-decomposition, seam b - Req 2.1).
          The unit consumes `usePersonalDetailsGeneration` internally; the shell
          injects the typed `update`, portrait props, and the species/class/
          career change handlers + `filteredCareers`. */}
      <PersonalDetailsSection
        character={character}
        update={update}
        portraitURL={portraitURL}
        handlePortraitUpload={handlePortraitUpload}
        handlePortraitRemove={handlePortraitRemove}
        handleSpeciesChange={handleSpeciesChange}
        handleClassChange={handleClassChange}
        handleCareerChange={handleCareerChange}
        filteredCareers={filteredCareers}
      />

      {/* Patron Deity â€” only visible for Dwarf priest characters */}
      {isDwarfSpecies(character.species) && isPriestCareer(character.career) && (
        <CollapsibleSection title="Patron Deity" storageKey="collapsible-deity-selector" defaultExpanded={true}>
          <DeitySelector character={character} updateCharacter={updateCharacter} />
        </CollapsibleSection>
      )}

      {/* Grudge Book â€” only visible for Dwarf characters (zero DOM otherwise per Req 8.5) */}
      {isDwarf(character.species) && (
        <CollapsibleSection title="Grudge Book" storageKey="collapsible-grudge-panel" defaultExpanded={true}>
          <GrudgePanel character={character} updateCharacter={updateCharacter} />
        </CollapsibleSection>
      )}

      {/* Yenlui Balance â€” only visible for Elf variants with useYenlui enabled (zero DOM otherwise per Req 8.6) */}
      {character.houseRules.useYenlui === true && isElf(character.species) && (
        <CollapsibleSection title="Yenlui Balance" storageKey="collapsible-yenlui-panel" defaultExpanded={true}>
          <div className={styles.fieldWithHelp}>
            <YenluiPanel character={character} updateCharacter={updateCharacter} />
            <HelpPopover concept="yenlui-balance">{getHelpContent('yenlui-balance')}</HelpPopover>
          </div>
        </CollapsibleSection>
      )}

      {/* Magical Burnout â€” only visible for High Magic users */}
      {hasHighMagic(character) && (
        <CollapsibleSection title="Magical Burnout" storageKey="collapsible-magical-burnout" defaultExpanded={true}>
          <MagicalBurnoutPanel character={character} updateCharacter={updateCharacter} />
        </CollapsibleSection>
      )}

      {/* Characteristics table + Movement + Wound Maximum (spec:
          character-page-decomposition, seam c). `showTBonus` now lives locally
          inside this unit; the single-tooltip-at-a-time state stays lifted here
          and is injected as props (Req 5.1, 5.4, 5.5). */}
      <CharacteristicsSection
        character={character}
        update={update}
        updateCharacter={updateCharacter}
        openCharacteristicRoll={openCharacteristicRoll}
        charTooltip={charTooltip}
        setCharTooltip={setCharTooltip}
        breakdownTooltip={breakdownTooltip}
        openBreakdownTooltip={openBreakdownTooltip}
        closeBreakdownTooltip={closeBreakdownTooltip}
      />

      {/* Psychology Tracker (Archives Vol. II) â€” only when enabled */}
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

      {/* â”€â”€â”€ RIGHT COLUMN: Skills, Talents, Gear â”€â”€â”€ */}
      <div className={`${styles.desktopGridRight}${activeSubTab !== 'abilities' && activeSubTab !== 'gear' ? ` ${styles.mobileHidden}` : ''}`}>
      {/* â•â•â• ABILITIES SECTION â•â•â• */}
      <div className={`${styles.abilitiesSection}${activeSubTab !== 'abilities' ? ` ${styles.mobileHidden}` : ''}`}>
      {/* Abilities Sub_Tab content extracted into a focused unit (spec:
          character-page-decomposition, seam e â€” Req 2.2). SkillFilter + Basic/
          Advanced Skills + Talents + Spells & Prayers + Known Runes + Rune
          Management. All Lifted_State (tooltip singleton, picker flags,
          deleteTarget, skill-filter state, addDropdown, expandedSpells) stays
          owned by the shell and is injected as props (Req 5.1, 5.4); the
          useCharacterEntities CRUD handlers are injected via `entities`
          (Req 5.3). Behaviour-preserving â€” identical DOM/ARIA/classes. */}
      <AbilitiesTab
        character={character}
        update={update}
        updateCharacter={updateCharacter}
        skillSearchText={skillSearchText}
        setSkillSearchText={setSkillSearchText}
        skillTrainedOnly={skillTrainedOnly}
        onTrainedOnlyChange={handleTrainedOnlyChange}
        careerSkillSet={careerSkillSet}
        tooltip={tooltip}
        setTooltip={setTooltip}
        breakdownTooltip={breakdownTooltip}
        openBreakdownTooltip={openBreakdownTooltip}
        closeBreakdownTooltip={closeBreakdownTooltip}
        expandedSpells={expandedSpells}
        entities={entities}
        addDropdown={addDropdown}
        setAddDropdown={setAddDropdown}
        setShowAdvSkillPicker={setShowAdvSkillPicker}
        setShowTalentPicker={setShowTalentPicker}
        setShowSpellPicker={setShowSpellPicker}
        setDeleteTarget={setDeleteTarget}
        setSpecTarget={setSpecTarget}
        openSkillRoll={openSkillRoll}
      />
      </div>{/* end abilitiesSection */}

      {/* â•â•â• GEAR â•â•â• */}
      <div className={`${styles.gearSection}${activeSubTab !== 'gear' ? ` ${styles.mobileHidden}` : ''}`}>
      {/* Gear Sub_Tab content extracted into a focused unit (spec:
          character-page-decomposition, seam f â€” Req 2.2). Encumbrance indicator
          + Trappings grid (drag-reorder + long-press contextual menu) + Armour
          Points auto-calculation + Consumables + Coin Purse / Wealth â†’ Treasury
          deposit + Encumbrance breakdown. All Lifted_State (trapping context
          menu, picker/editing/delete flags, breakdown-tooltip singleton) stays
          owned by the shell and is injected as props (Req 5.1, 5.4); the
          useCharacterEntities flag setters + delete dispatcher are injected via
          `entities` (Req 5.3) and the Wealth â†’ Treasury deposit is injected from
          useWealthTransfer (seam h / Task 4). Behaviour-preserving â€” identical
          DOM/ARIA/classes. */}
      <GearTab
        character={character}
        update={update}
        updateCharacter={updateCharacter}
        entities={entities}
        trappingsGridRef={trappingsGridRef}
        trappingsDragState={trappingsDragState}
        getTrappingGripProps={getTrappingGripProps}
        getTrappingItemProps={getTrappingItemProps}
        trappingsDropIndex={trappingsDropIndex}
        trappingsAnnouncement={trappingsAnnouncement}
        trappingLongPressHandlers={trappingLongPressHandlers}
        trappingContextMenu={trappingContextMenu}
        setTrappingContextMenu={setTrappingContextMenu}
        setShowTrappingPicker={setShowTrappingPicker}
        editingTrappingIndex={editingTrappingIndex}
        setEditingTrappingIndex={setEditingTrappingIndex}
        setDeleteTarget={setDeleteTarget}
        breakdownTooltip={breakdownTooltip}
        openBreakdownTooltip={openBreakdownTooltip}
        closeBreakdownTooltip={closeBreakdownTooltip}
        applyTransfer={applyTransfer}
        depositError={depositError}
      />
      </div>{/* end gearSection */}
      </div>{/* end desktopGridRight */}
      </div>{/* end desktopGrid */}

      {/* â•â•â• NOTES TAB â•â•â• */}
      {/* Notes Sub_Tab content extracted into its own unit (spec:
          character-page-decomposition, seam g â€” Req 2.1): Ambitions & Party +
          Corruption + Diseases + Session Notes + Timeline. Behaviour-preserving;
          the unit reads/writes through the typed update/updateCharacter surface
          and threads addRoll into the DiseasePanel exactly as before. The
          activeSubTab wrapper stays lifted in the shell (Req 5.1). */}
      {activeSubTab === 'notes' && (
        <NotesTab
          character={character}
          update={update}
          updateCharacter={updateCharacter}
          addRoll={addRoll}
        />
      )}
      </div>{/* end expandedContentInner */}</div>{/* end expandedContent */}

      {/* Pickers */}
      {showAdvSkillPicker && (
        <Picker items={ADV_SKILL_DB} getLabel={(s) => s.n} getGroup={(s) => s.c} onSelect={addAdvancedSkillFromPicker} onClose={() => setShowAdvSkillPicker(false)} title="Select Advanced Skill" />
      )}
      {showTalentPicker && (
        <Picker items={TALENT_DB} getLabel={(t) => t.name} onSelect={addTalentFromPicker} onClose={() => setShowTalentPicker(false)} title="Select Talent" />
      )}
      {specOptions && specTargetName !== undefined && (
        <Picker
          items={specOptions.names}
          getLabel={(n) => parseGroupedName(n).spec ?? 'No specialisation'}
          isDisabled={isNameOnSheet}
          onSelect={handleChooseSpecialisation}
          onCustom={specOptions.allowCustom ? (text) => handleChooseSpecialisation(specialiseName(specTargetName, text)) : undefined}
          onClose={() => setSpecTarget(null)}
          title={`${parseGroupedName(specTargetName).base}: choose specialisation`}
        />
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

      {/* Roll History â€” only on Abilities sub-tab (Req 14.2) */}
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

      {/* Breakdown Tooltips (Skill, CB, Encumbrance, Coin Weight, Trappings Enc) */}
      <CharacterBreakdownTooltips
        breakdownTooltip={breakdownTooltip}
        character={character}
        onClose={closeBreakdownTooltip}
      />

      {/* Portrait error toast */}
      <Toast message={portraitError} duration={5000} />

      {/* Tab order save error toast */}
      <Toast message={saveError ? 'Tab order could not be saved' : null} duration={5000} />
    </div>
  );
}
