import { useState, useMemo, useCallback } from 'react';
import type { Character, ArmourPoints, CharacteristicKey, CareerLevel, AdvancementEntry } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { Picker } from '../shared/Picker';
import { SpellPicker } from '../shared/SpellPicker';
import { Toast } from '../shared/Toast';
import { Tooltip } from '../shared/Tooltip';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { CAREER_SCHEMES, CAREER_CLASS_LIST } from '../../data/careers';
import { getCareersByClass, getCareerScheme } from '../../logic/careers';
import { getAdvancementCost, calculateBulkAdvancement, advanceCharacteristic, advanceSkill, isCareerLevelComplete, careerSkillMatches, undoAdvancement, redoAdvancement, sortSkillsByCareerStatus, archiveOldEntries, restoreArchivedEntry, getFutureCareerLevel, hasRuneMagicTalent, ensureCareerSkillsExist, hasSpellcastingTalent, getSpellcastingTypes, getSpellLearningCost, countMemorizedByType, learnSpell, hasRitualMagicTalent, getCharacterLore, learnRitual, getCurrentLevelTalents, formatXpFeedback, applyBulkAdvancement, calculateTierBoundaryCost } from '../../logic/advancement';
import { filterSkillEntries } from '../../logic/skill-filter';
import { getBonus } from '../../logic/calculators';
import { TALENT_DB } from '../../data/talents';
import { SPELL_LIST } from '../../data/spells';
import { RITUAL_LIST } from '../../data/rituals';
import { resolveTalentTooltip, resolveSkillTooltip } from '../../logic/tooltip-content';
import { getEligibleCareers } from '../../logic/career-eligibility';
import { getEligibleSpells } from '../../logic/spell-picker-utils';
import type { TooltipContent } from '../../logic/tooltip-content';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { RuneLearningPanel } from '../shared/RuneLearningPanel';
import { SwordDancingPanel } from '../shared/SwordDancingPanel';
import { DeitySelector } from '../shared/DeitySelector';
import { GraduationCap, TrendingUp, ScrollText, CheckCircle, Swords, BookOpen, Sparkles, Undo2, Redo2 } from 'lucide-react';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import styles from './AdvancementPage.module.css';

interface ActiveTooltip {
  type: 'talent' | 'skill';
  key: string;
  anchorEl: HTMLElement;
  content: TooltipContent;
}

interface AdvancementPageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const CHAR_FULL_NAMES: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness',
  I: 'Initiative', Ag: 'Agility', Dex: 'Dexterity', Int: 'Intelligence',
  WP: 'Willpower', Fel: 'Fellowship',
};


export function AdvancementPage({ character, update, updateCharacter }: AdvancementPageProps) {
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showCareerPicker, setShowCareerPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSwitchCareerPicker, setShowSwitchCareerPicker] = useState(false);
  const [redoStack, setRedoStack] = useState<AdvancementEntry[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [hideOutOfCareerSkills, setHideOutOfCareerSkills] = useState(() => {
    try { return localStorage.getItem('wfrp-hideOutOfCareerSkills') === 'true'; } catch { return false; }
  });

  const toggleHideOutOfCareer = () => {
    const next = !hideOutOfCareerSkills;
    setHideOutOfCareerSkills(next);
    try { localStorage.setItem('wfrp-hideOutOfCareerSkills', String(next)); } catch { /* ignore */ }
  };
  const [xpEditMode, setXpEditMode] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSpellLearningPicker, setShowSpellLearningPicker] = useState(false);
  const [spellLearningType, setSpellLearningType] = useState<'petty' | 'arcane' | 'miracle' | 'chaos'>('petty');
  const [showRitualPicker, setShowRitualPicker] = useState(false);
  const [xpToastMessage, setXpToastMessage] = useState<string | null>(null);
  const [xpShake, setXpShake] = useState(false);
  const [skillSearchText, setSkillSearchText] = useState('');

  const triggerXpFeedback = useCallback((cost: number, available: number) => {
    // Reset to null first so repeated identical messages still trigger the Toast
    setXpToastMessage(null);
    requestAnimationFrame(() => setXpToastMessage(formatXpFeedback(cost, available)));
    setXpShake(true);
    setTimeout(() => setXpShake(false), 400);
  }, []);

  const handleTalentTooltip = (talentName: string, characterDesc: string, event: React.MouseEvent) => {
    const content = resolveTalentTooltip(talentName, characterDesc);
    if (!content) return;
    if (activeTooltip?.type === 'talent' && activeTooltip.key === talentName) {
      setActiveTooltip(null);
      return;
    }
    setActiveTooltip({
      type: 'talent',
      key: talentName,
      anchorEl: event.currentTarget as HTMLElement,
      content,
    });
  };

  const handleSkillTooltip = (skillName: string, characteristic: string, event: React.MouseEvent) => {
    const content = resolveSkillTooltip(skillName, characteristic);
    if (!content) return;
    if (activeTooltip?.type === 'skill' && activeTooltip.key === skillName) {
      setActiveTooltip(null);
      return;
    }
    setActiveTooltip({
      type: 'skill',
      key: skillName,
      anchorEl: event.currentTarget as HTMLElement,
      content,
    });
  };

  const handleUndo = () => {
    const result = undoAdvancement(character);
    if (!result) return;
    updateCharacter(() => result.character);
    setRedoStack(prev => [...prev, result.undoneEntry]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    const result = redoAdvancement(character, entry);
    if (!result) return;
    updateCharacter(() => result.character);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const handleRestoreEntry = (archiveIndex: number) => {
    updateCharacter((c) => restoreArchivedEntry(c, archiveIndex));
  };

  const handleClearArchive = () => {
    updateCharacter((c) => ({ ...c, advancementLogArchive: [] }));
    setShowClearConfirm(false);
  };

  const scheme = getCareerScheme(character.career);
  const allLevels = scheme
    ? [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5].filter(Boolean) as CareerLevel[]
    : [];
  const careerLevel = allLevels.find(l => l.title === character.careerLevel);
  const careerLevelNum = allLevels.findIndex(l => l.title === character.careerLevel) + 1;
  const isComplete = scheme && careerLevelNum > 0 ? isCareerLevelComplete(character, character.career, careerLevelNum) : false;

  const careerChars = careerLevel?.characteristics ?? [];
  const careerSkills = careerLevel?.skills ?? [];
  const careerTalents = careerLevel?.talents ?? [];

  // Sorted skills: career skills first, then alphabetical within each group
  const sortedSkills = useMemo(
    () => sortSkillsByCareerStatus(character.bSkills, character.aSkills, careerSkills),
    [character.bSkills, character.aSkills, careerSkills]
  );

  // Apply search + career-only filter using filterSkillEntries (AND logic)
  const filteredSkills = useMemo(
    () => filterSkillEntries(sortedSkills, { searchText: skillSearchText, careerOnly: hideOutOfCareerSkills }),
    [sortedSkills, skillSearchText, hideOutOfCareerSkills]
  );
  const inCareerSkills = filteredSkills.filter(e => e.inCareer);
  const outCareerSkills = filteredSkills.filter(e => !e.inCareer);

  // Career progress analysis — WFRP 4e completion thresholds: Level 1=5, 2=10, 3=15, 4=20, 5=25
  const completionThreshold = ({ 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 } as Record<number, number>)[careerLevelNum] ?? 5;
  const maxLevel = allLevels.length;
  const isMaxLevel = careerLevelNum >= maxLevel;
  const charsProgress = careerChars.map(k => ({ name: k, advances: character.chars[k].a, met: character.chars[k].a >= completionThreshold }));
  const charsMet = charsProgress.every(c => c.met);
  const allSkills = [...character.bSkills, ...character.aSkills];
  const skillsWithAdvances = careerSkills.filter(sn => allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= completionThreshold));
  const skillsMet = skillsWithAdvances.length >= Math.min(8, careerSkills.length);
  const talentsOwned = getCurrentLevelTalents(character.career, careerLevelNum).filter(tn => character.talents.some(t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' (')));
  const talentsMet = talentsOwned.length >= 1;
  const readyToProgress = charsMet && skillsMet && talentsMet;
  const advanceLevelCost = readyToProgress ? 100 : 200;
  const canAffordAdvance = character.xpCur >= advanceLevelCost;

  // Advance career level
  const handleAdvanceLevel = () => {
    if (isMaxLevel || !canAffordAdvance) return;
    if (!scheme) return;
    const nextLevelNum = careerLevelNum + 1;
    const nextLevel = scheme[`level${nextLevelNum}` as keyof typeof scheme] as CareerLevel;
    if (!nextLevel) return;
    updateCharacter((c) => ensureCareerSkillsExist(archiveOldEntries({
      ...c,
      careerLevel: nextLevel.title,
      status: nextLevel.status,
      xpCur: c.xpCur - advanceLevelCost,
      xpSpent: c.xpSpent + advanceLevelCost,
      advancementLog: [...c.advancementLog, {
        timestamp: Date.now(), type: 'career_level', name: `${c.career} → ${nextLevel.title}`,
        from: careerLevelNum, to: nextLevelNum, xpCost: advanceLevelCost,
        careerLevel: nextLevel.title, inCareer: true,
      }],
    }), nextLevel.skills));
    setRedoStack([]);
  };

  // Switch career
  const handleSwitchCareer = (newCareer: string) => {
    const newScheme = getCareerScheme(newCareer);
    if (!newScheme || newCareer === character.career) { setShowSwitchCareerPicker(false); return; }
    const sameClass = newScheme.class === character.class;
    const switchCost = (readyToProgress ? 100 : 200) + (sameClass ? 0 : 100);
    if (character.xpCur < switchCost) { setShowSwitchCareerPicker(false); return; }
    updateCharacter((c) => ensureCareerSkillsExist(archiveOldEntries({
      ...c,
      career: newCareer,
      class: newScheme.class,
      careerLevel: newScheme.level1.title,
      status: newScheme.level1.status,
      careerPath: c.careerPath ? `${c.careerPath} → ${newCareer}` : `${c.career} → ${newCareer}`,
      xpCur: c.xpCur - switchCost,
      xpSpent: c.xpSpent + switchCost,
      advancementLog: [...c.advancementLog, {
        timestamp: Date.now(), type: 'career_switch', name: `${c.career} → ${newCareer}`,
        from: 0, to: 0, xpCost: switchCost,
        careerLevel: newScheme.level1.title, inCareer: true,
      }],
    }), newScheme.level1.skills));
    setRedoStack([]);
    setShowSwitchCareerPicker(false);
  };

  // Career pickers
  const handleClassSelect = (cls: string) => { update('class', cls); setShowClassPicker(false); };
  const handleCareerSelect = (career: string) => {
    const s = getCareerScheme(career);
    if (s) {
      updateCharacter((c) => ensureCareerSkillsExist({ ...c, career, class: s.class, careerLevel: s.level1.title, status: s.level1.status }, s.level1.skills));
    }
    setShowCareerPicker(false);
  };
  const handleLevelSelect = (levelTitle: string) => {
    if (!scheme) return;
    const level = allLevels.find(l => l.title === levelTitle);
    if (level) updateCharacter((c) => ({ ...c, careerLevel: level.title, status: level.status }));
    setShowLevelPicker(false);
  };

  // Advance characteristic
  const handleAdvanceChar = (key: CharacteristicKey) => {
    const inCareer = careerChars.includes(key);
    const cost = getAdvancementCost('characteristic', character.chars[key].a, inCareer);
    if (character.xpCur < cost) {
      triggerXpFeedback(cost, character.xpCur);
      return;
    }
    updateCharacter((c) => archiveOldEntries(advanceCharacteristic(c, key, inCareer)));
    setRedoStack([]);
  };

  const handleBulkAdvanceChar = (key: CharacteristicKey) => {
    const inCareer = careerChars.includes(key);
    const currentAdv = character.chars[key].a;
    const bulk = calculateBulkAdvancement('characteristic', currentAdv, character.xpCur, inCareer, 5);
    if (bulk.count === 0) {
      const nextCost = getAdvancementCost('characteristic', currentAdv, inCareer);
      triggerXpFeedback(nextCost, character.xpCur);
      return;
    }
    updateCharacter((c) => {
      let updated = { ...c };
      for (let i = 0; i < bulk.count; i++) {
        updated = advanceCharacteristic(updated, key, inCareer);
      }
      return archiveOldEntries(updated);
    });
    setRedoStack([]);
  };

  // Advance skill
  const handleAdvanceSkill = (skillIndex: number, isBasic: boolean) => {
    const skills = isBasic ? character.bSkills : character.aSkills;
    const skill = skills[skillIndex];
    const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
    const cost = getAdvancementCost('skill', skill.a, inCareer);
    if (character.xpCur < cost) {
      triggerXpFeedback(cost, character.xpCur);
      return;
    }
    updateCharacter((c) => archiveOldEntries(advanceSkill(c, skillIndex, isBasic, inCareer)));
    setRedoStack([]);
  };

  const handleBulkAdvanceSkill = (skillIndex: number, isBasic: boolean, count: number) => {
    const skills = isBasic ? character.bSkills : character.aSkills;
    const skill = skills[skillIndex];
    const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
    const bulk = calculateBulkAdvancement('skill', skill.a, character.xpCur, inCareer, count);
    if (bulk.count === 0) {
      const nextCost = getAdvancementCost('skill', skill.a, inCareer);
      triggerXpFeedback(nextCost, character.xpCur);
      return;
    }
    updateCharacter((c) => {
      let updated = { ...c };
      for (let i = 0; i < bulk.count; i++) {
        updated = advanceSkill(updated, skillIndex, isBasic, inCareer);
      }
      return archiveOldEntries(updated);
    });
    setRedoStack([]);
  };

  // Advance skill to next tier boundary
  const handleAdvanceToTier = (skillIndex: number, isBasic: boolean) => {
    const skills = isBasic ? character.bSkills : character.aSkills;
    const skill = skills[skillIndex];
    const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
    const result = applyBulkAdvancement(character, skillIndex, isBasic, inCareer);
    if ('character' in result) {
      updateCharacter(() => archiveOldEntries(result.character));
      setRedoStack([]);
    } else {
      triggerXpFeedback(result.cost, result.available);
    }
  };

  // Acquire talent using the WFRP 4e cost: 100 × (times taken + 1) in-career, doubled out
  const handleAcquireTalent = (talentName: string) => {
    const inCareer = careerTalents.some(ct => talentName === ct || talentName.startsWith(ct + ' (') || ct.startsWith(talentName + ' ('));
    const existing = character.talents.find(t => t.n === talentName);
    const timesTaken = existing ? existing.lvl : 0;
    const cost = getAdvancementCost('talent', timesTaken, inCareer);
    if (character.xpCur < cost) {
      triggerXpFeedback(cost, character.xpCur);
      return;
    }
    updateCharacter((c) => {
      const existingInner = c.talents.find(t => t.n === talentName);
      const timesTakenInner = existingInner ? existingInner.lvl : 0;
      const costInner = getAdvancementCost('talent', timesTakenInner, inCareer);
      if (c.xpCur < costInner) return c;
      const newTalents = [...c.talents];
      if (existingInner) {
        const idx = newTalents.findIndex(t => t.n === talentName);
        newTalents[idx] = { ...existingInner, lvl: existingInner.lvl + 1 };
      } else {
        newTalents.push({ n: talentName, lvl: 1, desc: TALENT_DB.find(t => t.name === talentName)?.desc ?? '' });
      }
      return archiveOldEntries({
        ...c,
        talents: newTalents,
        xpCur: c.xpCur - costInner,
        xpSpent: c.xpSpent + costInner,
        advancementLog: [...c.advancementLog, {
          timestamp: Date.now(), type: 'talent', name: talentName,
          from: timesTakenInner, to: timesTakenInner + 1, xpCost: costInner,
          careerLevel: c.careerLevel, inCareer,
        }],
      });
    });
    setRedoStack([]);
  };

  // Learn spell from picker
  const handleLearnSpell = (spellData: typeof SPELL_LIST[number]) => {
    const counts = countMemorizedByType(character);
    const intBonus = getBonus(character.chars.Int.i + character.chars.Int.a + character.chars.Int.b);
    const wpBonus = getBonus(character.chars.WP.i + character.chars.WP.a + character.chars.WP.b);
    const charBonus = spellLearningType === 'petty' ? wpBonus : intBonus;
    const currentCount = counts[spellLearningType];
    const cost = getSpellLearningCost(spellLearningType, currentCount, charBonus);

    updateCharacter((c) => archiveOldEntries(learnSpell(c, spellData, spellLearningType, cost)));
    setRedoStack([]);
    setShowSpellLearningPicker(false);
  };

  // Learn ritual from picker
  const handleLearnRitual = (ritual: typeof RITUAL_LIST[number]) => {
    updateCharacter((c) => archiveOldEntries(learnRitual(c, ritual)));
    setRedoStack([]);
    setShowRitualPicker(false);
  };

  const careerNames = character.class ? getCareersByClass(character.class) : Object.keys(CAREER_SCHEMES);
  const levelTitles = allLevels.map(l => l.title);

  return (
    <div className={styles.sectionGap}>
      {/* Career Selection */}
      <Card>
        <SectionHeader icon={GraduationCap} title="Career" action={
          isComplete ? <span className={styles.completeBadge}><CheckCircle size={14} /> Complete</span> : undefined
        } />
        {character.career && character.careerLevel ? (
          <div className={styles.careerSummaryLine}>
            <span className={styles.careerSummaryText}>
              {character.career} &gt; {character.careerLevel} (Level {careerLevelNum}) — {character.status || 'No Status'}
            </span>
            <button type="button" onClick={() => setShowCareerPicker(true)} className={styles.careerSummaryEditBtn}>Change</button>
          </div>
        ) : (
          <div className={styles.gridAutoFill}>
            <div>
              <span className={styles.fieldLabel}>Class</span>
              <button type="button" onClick={() => setShowClassPicker(true)} className={styles.smallBtnWide}>{character.class || 'Select Class'}</button>
            </div>
            <div>
              <span className={styles.fieldLabel}>Career</span>
              <button type="button" onClick={() => setShowCareerPicker(true)} className={styles.smallBtnWide}>{character.career || 'Select Career'}</button>
            </div>
            <div>
              <span className={styles.fieldLabel}>Level</span>
              <button type="button" onClick={() => setShowLevelPicker(true)} className={styles.smallBtnWide}>{character.careerLevel || 'Select Level'}</button>
            </div>
            <EditableField label="Status" value={character.status} onSave={(v) => update('status', v)} />
          </div>
        )}
      </Card>

      {/* XP Tracking */}
      <Card>
        <SectionHeader icon={TrendingUp} title="Experience Points" action={
          <button type="button" onClick={() => setXpEditMode(!xpEditMode)} className={styles.hideZeroBtn}>
            {xpEditMode ? 'Done' : 'Edit'}
          </button>
        } />
        {xpEditMode ? (
          <div className={styles.gridAutoFill}>
            <EditableField label="Current XP" value={character.xpCur} type="number" onSave={(v) => update('xpCur', v)} />
            <EditableField label="Spent XP" value={character.xpSpent} type="number" onSave={(v) => update('xpSpent', v)} />
            <EditableField label="Total XP" value={character.xpTotal} type="number" onSave={(v) => update('xpTotal', v)} />
          </div>
        ) : (
          <div className={`${styles.xpDisplayRow} ${xpShake ? styles.xpDisplayShake : ''}`}>
            <div className={styles.xpDisplayItem}>
              <span className={styles.xpDisplayLabel}>Current</span>
              <span className={styles.xpDisplayValue}>{character.xpCur}</span>
            </div>
            <div className={styles.xpDisplayItem}>
              <span className={styles.xpDisplayLabel}>Spent</span>
              <span className={styles.xpDisplayValue}>{character.xpSpent}</span>
            </div>
            <div className={styles.xpDisplayItem}>
              <span className={styles.xpDisplayLabel}>Total</span>
              <span className={styles.xpDisplayValue}>{character.xpTotal}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Career Progress */}
      {scheme && (
        <Card>
          <div className={styles.sectionWithHelp}>
            <SectionHeader icon={CheckCircle} title="Career Progress" />
            <HelpPopover concept="career-advancement">{getHelpContent('career-advancement')}</HelpPopover>
          </div>
          <div className={styles.progressPanel}>
            <div className={styles.progressTitle}>
              {character.career} — {character.careerLevel}
            </div>
            <div className={styles.progressSubtitle}>Level {careerLevelNum} • {character.class} • {character.status}</div>
          </div>

          {!isMaxLevel && (
            <div className={readyToProgress ? styles.checklistPanelComplete : styles.checklistPanel}>
              <div className={charsMet ? styles.checklistItemMet : styles.checklistItemUnmet}>
                {charsMet ? '✓' : '✗'} Characteristics ({charsProgress.filter(c => c.met).length}/{charsProgress.length} at {completionThreshold}+ advances)
              </div>
              <div className={styles.charBadgeRow}>
                {charsProgress.map((c) => (
                  <span key={c.name} title={CHAR_FULL_NAMES[c.name as CharacteristicKey] || c.name} className={c.met ? styles.charBadgeMet : styles.charBadgeUnmet}>
                    {c.name} {c.met ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              <div className={skillsMet ? styles.checklistItemMet : styles.checklistItemUnmet}>
                {skillsMet ? '✓' : '✗'} Skills: {skillsWithAdvances.length}/{Math.min(8, careerSkills.length)} at {completionThreshold}+
              </div>
              <div className={`${styles.talentChecklistItem} ${talentsMet ? styles.checklistItemMet : styles.checklistItemUnmet}`}>
                {talentsMet ? '✓' : '✗'} Talent: {talentsOwned.length > 0 ? talentsOwned.join(', ') : 'none'}
              </div>
              {readyToProgress && (
                <div className={styles.readyBanner}>
                  ✓ Ready to advance!
                </div>
              )}
            </div>
          )}

          {isMaxLevel && (
            <div className={styles.maxLevelBanner}>
              Max Level Reached
            </div>
          )}

          <div className={styles.careerActionsRow}>
            {!isMaxLevel && (
              <button type="button" onClick={handleAdvanceLevel} disabled={!canAffordAdvance} className={
                readyToProgress && canAffordAdvance ? styles.advanceLevelBtnReady
                  : canAffordAdvance ? styles.advanceLevelBtnAffordable
                  : styles.advanceLevelBtnDisabled
              }>
                Advance Career Level ({advanceLevelCost} XP)
              </button>
            )}
            <button type="button" onClick={() => setShowSwitchCareerPicker(true)} className={styles.switchCareerBtn}>
              Switch Career
            </button>
          </div>
        </Card>
      )}

      {/* Characteristics Advancement */}
      <Card>
        <div className={styles.sectionWithHelp}>
          <SectionHeader icon={Swords} title="Advance Characteristics" />
          <HelpPopover concept="xp-cost-table">{getHelpContent('xp-cost-table')}</HelpPopover>
        </div>
        <div className={styles.charHelpText}>
          <span className={styles.charHelpInCareer}>In-Career</span> costs follow the WFRP 4e tiered table. <span className={styles.charHelpOutCareer}>Out-of-Career</span> costs are double.
        </div>
        <div className={styles.charGrid}>
          {CHAR_KEYS.map((key) => {
            const c = character.chars[key];
            const inCareer = careerChars.includes(key);
            const currentValue = c.i + c.a;
            const cost = getAdvancementCost('characteristic', c.a, inCareer);
            const canAfford = character.xpCur >= cost;
            const bulk = calculateBulkAdvancement('characteristic', c.a, character.xpCur, inCareer, 5);
            const futureLevel = !inCareer ? getFutureCareerLevel(character.career, careerLevelNum, { type: 'characteristic', key }) : null;
            return (
              <div key={key} className={inCareer ? styles.charCardInCareer : styles.charCardOutCareer}>
                <div className={styles.charCardHeader}>
                  <span className={inCareer ? styles.charNameInCareer : styles.charNameOutCareer} title={CHAR_FULL_NAMES[key]}>{key}</span>
                  <span className={inCareer ? styles.charStatusInCareer : styles.charStatusOutCareer}>{inCareer ? 'In-Career' : 'Out-of-Career'}</span>
                </div>
                <div className={styles.charStatsRow}>
                  <span className={styles.charStatLabel}>Value: <strong className={styles.charStatValue}>{currentValue}</strong></span>
                  <span className={styles.charStatLabel}>Advances: <strong>{c.a}</strong></span>
                </div>
                <div className={styles.charCostRow}>
                  <span className={styles.charCostLabel}>Next: <strong className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</strong></span>
                  {futureLevel !== null && (
                    <span className={styles.futureCareerWarning}>In-career at CL{futureLevel}</span>
                  )}
                </div>
                <div className={styles.charBtnRow}>
                  <button type="button" onClick={() => handleAdvanceChar(key)} disabled={!canAfford} className={canAfford ? styles.advanceBtn : styles.advanceBtnDisabled}>+1 ({cost} XP)</button>
                  {bulk.count > 1 && (
                    <button type="button" onClick={() => handleBulkAdvanceChar(key)} className={styles.advanceBtn}>+{bulk.count} ({bulk.totalCost} XP)</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Skills Advancement */}
      <Card>
        <SectionHeader icon={BookOpen} title="Advance Skills" action={
          <button type="button" onClick={toggleHideOutOfCareer} className={styles.hideZeroBtn}>
            {hideOutOfCareerSkills ? 'Show All' : 'Career Only'}
          </button>
        } />
        <div className={styles.charHelpText}>
          <span className={styles.charHelpInCareer}>In-Career</span> skills use the tiered cost table. <span className={styles.charHelpOutCareer}>Out-of-Career</span> costs are double.
        </div>
        <input
          type="text"
          placeholder="Search skills…"
          aria-label="Search skills by name"
          value={skillSearchText}
          onChange={(e) => setSkillSearchText(e.target.value)}
          className={styles.skillSearchInput}
        />
        <table className={styles.tableBase}>
          <thead>
            <tr>
              <th className={styles.th}>Skill</th>
              <th className={styles.th}>Char</th>
              <th className={styles.th}>Adv</th>
              <th className={styles.th}>Total</th>
              <th className={styles.th}>Cost</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {inCareerSkills.length > 0 && (
              <tr>
                <td colSpan={7} className={styles.skillGroupHeaderInCareer}>
                  Career Skills ({inCareerSkills.length})
                </td>
              </tr>
            )}
            {inCareerSkills.map((entry) => {
              const charVal = character.chars[entry.skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + entry.skill.a) : entry.skill.a;
              const cost = getAdvancementCost('skill', entry.skill.a, true);
              const canAfford = character.xpCur >= cost;
              return (
                <tr key={`${entry.isBasic ? 'b' : 'a'}-${entry.originalIndex}`} className={styles.skillRowInCareer}>
                  <td className={styles.td}>
                    <button
                      type="button"
                      onClick={(e) => handleSkillTooltip(entry.skill.n, entry.skill.c, e)}
                      aria-describedby={
                        activeTooltip?.type === 'skill' && activeTooltip.key === entry.skill.n
                          ? `tooltip-skill-${entry.skill.n}`
                          : undefined
                      }
                      className={styles.tooltipBtn}
                    >{entry.skill.n}</button>{!entry.isBasic && <span className={styles.advancedSkillMarker}> *</span>}
                  </td>
                  <td className={styles.tdMuted}>{entry.skill.c}</td>
                  <td className={styles.td}>{entry.skill.a}</td>
                  <td className={styles.tdBold}>{total}</td>
                  <td className={`${styles.td} ${canAfford ? styles.canAfford : styles.cannotAfford}`}>{cost} XP</td>
                  <td className={styles.statusInCareer}>In</td>
                  <td className={styles.td}>
                    <div className={styles.skillBtnRow} role="group" aria-label="Advance skill amount">
                      <button type="button" onClick={() => handleAdvanceSkill(entry.originalIndex, entry.isBasic)} disabled={!canAfford}>+1</button>
                      <button type="button" onClick={() => handleBulkAdvanceSkill(entry.originalIndex, entry.isBasic, 5)} disabled={!canAfford}>+5</button>
                      {entry.skill.a < 25 && (
                        <button type="button" onClick={() => handleAdvanceToTier(entry.originalIndex, entry.isBasic)} title={`Advance to next tier (${calculateTierBoundaryCost('skill', entry.skill.a, true).targetAdvances})`}>Tier</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {outCareerSkills.length > 0 && (
          <CollapsibleSection title={`Other Skills (${outCareerSkills.length})`} storageKey="collapsible-other-skills" defaultExpanded={false}>
            <table className={styles.tableBase}>
              <thead>
                <tr>
                  <th className={styles.th}>Skill</th>
                  <th className={styles.th}>Char</th>
                  <th className={styles.th}>Adv</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Cost</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {outCareerSkills.map((entry) => {
                  const charVal = character.chars[entry.skill.c as CharacteristicKey];
                  const total = charVal ? (charVal.i + charVal.a + charVal.b + entry.skill.a) : entry.skill.a;
                  const cost = getAdvancementCost('skill', entry.skill.a, false);
                  const canAfford = character.xpCur >= cost;
                  const futureLevel = getFutureCareerLevel(character.career, careerLevelNum, { type: 'skill', name: entry.skill.n });
                  return (
                    <tr key={`${entry.isBasic ? 'b' : 'a'}-${entry.originalIndex}`} className={styles.skillRowOutCareer}>
                      <td className={styles.td}>
                        <button
                          type="button"
                          onClick={(e) => handleSkillTooltip(entry.skill.n, entry.skill.c, e)}
                          aria-describedby={
                            activeTooltip?.type === 'skill' && activeTooltip.key === entry.skill.n
                              ? `tooltip-skill-${entry.skill.n}`
                              : undefined
                          }
                          className={styles.tooltipBtn}
                        >{entry.skill.n}</button>{!entry.isBasic && <span className={styles.advancedSkillMarker}> *</span>}
                      </td>
                      <td className={styles.tdMuted}>{entry.skill.c}</td>
                      <td className={styles.td}>{entry.skill.a}</td>
                      <td className={styles.tdBold}>{total}</td>
                      <td className={`${styles.td} ${canAfford ? styles.canAfford : styles.cannotAfford}`}>{cost} XP</td>
                      <td className={styles.statusOutCareer}>Out{futureLevel !== null && (
                        <> <span className={styles.futureCareerWarning}>In-career at CL{futureLevel}</span></>
                      )}</td>
                      <td className={styles.td}>
                        <div className={styles.skillBtnRow} role="group" aria-label="Advance skill amount">
                          <button type="button" onClick={() => handleAdvanceSkill(entry.originalIndex, entry.isBasic)} disabled={!canAfford}>+1</button>
                          <button type="button" onClick={() => handleBulkAdvanceSkill(entry.originalIndex, entry.isBasic, 5)} disabled={!canAfford}>+5</button>
                          {entry.skill.a < 25 && (
                            <button type="button" onClick={() => handleAdvanceToTier(entry.originalIndex, entry.isBasic)} title={`Advance to next tier (${calculateTierBoundaryCost('skill', entry.skill.a, false).targetAdvances})`}>Tier</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CollapsibleSection>
        )}
      </Card>

      {/* Talents Advancement */}
      <Card>
        <SectionHeader icon={Sparkles} title="Acquire Talents" />
        <div className={styles.talentHelpText}>
          Talent cost: 100 × (times taken + 1) XP for <span className={styles.charHelpInCareer}>in-career</span>, doubled for <span className={styles.charHelpOutCareer}>out-of-career</span>.
        </div>
        {careerTalents.length > 0 && (
          <>
            <div className={styles.talentGroupLabelInCareer}>In-Career Talents</div>
            <div className={styles.talentGrid}>
              {careerTalents.map((talentName) => {
                const existing = character.talents.find(t => t.n === talentName);
                const timesTaken = existing ? existing.lvl : 0;
                const cost = getAdvancementCost('talent', timesTaken, true);
                const canAfford = character.xpCur >= cost;
                return (
                  <div key={talentName} className={styles.talentCardInCareer}>
                    <button
                      type="button"
                      onClick={(e) => handleTalentTooltip(talentName, existing?.desc ?? '', e)}
                      aria-describedby={
                        activeTooltip?.type === 'talent' && activeTooltip.key === talentName
                          ? `tooltip-talent-${talentName}`
                          : undefined
                      }
                      className={styles.talentName}
                    >{talentName}</button>
                    <div className={styles.talentMeta}>
                      Level: {timesTaken} | Next: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                    </div>
                    <button type="button" onClick={() => handleAcquireTalent(talentName)} disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}>
                      {timesTaken === 0 ? 'Acquire' : '+1 Level'} ({cost} XP)
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {character.talents.filter(t => !careerTalents.includes(t.n)).length > 0 && (
          <>
            <div className={styles.talentGroupLabelOutCareer}>Out-of-Career Talents (owned)</div>
            <div className={styles.talentGrid}>
              {character.talents.filter(t => !careerTalents.includes(t.n)).map((talent) => {
                const cost = getAdvancementCost('talent', talent.lvl, false);
                const canAfford = character.xpCur >= cost;
                const futureLevel = getFutureCareerLevel(character.career, careerLevelNum, { type: 'talent', name: talent.n });
                return (
                  <div key={talent.n} className={styles.talentCardOutCareer}>
                    <button
                      type="button"
                      onClick={(e) => handleTalentTooltip(talent.n, talent.desc ?? '', e)}
                      aria-describedby={
                        activeTooltip?.type === 'talent' && activeTooltip.key === talent.n
                          ? `tooltip-talent-${talent.n}`
                          : undefined
                      }
                      className={styles.talentName}
                    >{talent.n}</button>
                    <div className={styles.talentMeta}>
                      Level: {talent.lvl} | Next: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                      {futureLevel !== null && (
                        <> <span className={styles.futureCareerWarning}>In-career at CL{futureLevel}</span></>
                      )}
                    </div>
                    <button type="button" onClick={() => handleAcquireTalent(talent.n)} disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}>
                      +1 Level ({cost} XP)
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {/* Future career talents not yet owned and not currently in-career */}
        {scheme && careerLevelNum < maxLevel && (() => {
          const ownedNames = new Set(character.talents.map(t => t.n));
          const inCareerSet = new Set(careerTalents);
          const futureTalents: { name: string; level: number }[] = [];
          for (let lvl = careerLevelNum + 1; lvl <= maxLevel; lvl++) {
            const lvlData = scheme[`level${lvl}` as keyof typeof scheme] as CareerLevel;
            for (const tn of lvlData.talents) {
              if (!inCareerSet.has(tn) && !ownedNames.has(tn) && !futureTalents.some(ft => ft.name === tn)) {
                futureTalents.push({ name: tn, level: lvl });
              }
            }
          }
          if (futureTalents.length === 0) return null;
          return (
            <>
              <div className={styles.talentGroupLabelOutCareer}>Future Career Talents (not yet owned)</div>
              <div className={styles.talentGrid}>
                {futureTalents.map(({ name: talentName, level }) => {
                  const cost = getAdvancementCost('talent', 0, false);
                  const canAfford = character.xpCur >= cost;
                  return (
                    <div key={talentName} className={styles.talentCardOutCareer}>
                      <button
                        type="button"
                        onClick={(e) => handleTalentTooltip(talentName, '', e)}
                        aria-describedby={
                          activeTooltip?.type === 'talent' && activeTooltip.key === talentName
                            ? `tooltip-talent-${talentName}`
                            : undefined
                        }
                        className={styles.talentName}
                      >{talentName}</button>
                      <div className={styles.talentMeta}>
                        Not owned | Next: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                        {' '}<span className={styles.futureCareerWarning}>In-career at CL{level}</span>
                      </div>
                      <button type="button" onClick={() => handleAcquireTalent(talentName)} disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}>
                        Acquire ({cost} XP)
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </Card>

      {hasRuneMagicTalent(character) && (
        <>
        <DeitySelector character={character} updateCharacter={updateCharacter} />
        <RuneLearningPanel character={character} updateCharacter={updateCharacter} />
        </>
      )}

      <SwordDancingPanel character={character} updateCharacter={updateCharacter} />

      {/* Spell & Miracle Learning */}
      {hasSpellcastingTalent(character) && (() => {
        const spellTypes = getSpellcastingTypes(character);
        if (spellTypes.length === 0) return null;
        const counts = countMemorizedByType(character);
        const intBonus = getBonus(character.chars.Int.i + character.chars.Int.a + character.chars.Int.b);
        const wpBonus = getBonus(character.chars.WP.i + character.chars.WP.a + character.chars.WP.b);

        // Generate a cost schedule showing current position
        const buildCostSchedule = (type: 'petty' | 'arcane' | 'miracle' | 'chaos', bonus: number, count: number) => {
          const schedule: { from: number; to: number; cost: number; current: boolean }[] = [];
          const maxShow = Math.max(count + 3, 6); // Show a few beyond current
          for (let i = 0; i < maxShow; i++) {
            const cost = getSpellLearningCost(type, i, bonus);
            const tier = type === 'miracle' ? i : Math.floor(i / Math.max(bonus, 1));
            const tierStart = type === 'miracle' ? i : tier * Math.max(bonus, 1);
            const tierEnd = type === 'miracle' ? i + 1 : (tier + 1) * Math.max(bonus, 1);
            // Only add new tier entries
            if (schedule.length === 0 || schedule[schedule.length - 1].cost !== cost) {
              schedule.push({ from: tierStart, to: tierEnd, cost, current: i === count });
            } else if (i === count) {
              schedule[schedule.length - 1].current = true;
            }
          }
          return schedule;
        };

        return (
          <Card>
            <SectionHeader icon={BookOpen} title="Learn Spells & Prayers" />
            <div className={styles.talentGrid}>
              {spellTypes.includes('petty') && (() => {
                const currentCount = counts.petty;
                const cost = getSpellLearningCost('petty', currentCount, wpBonus);
                const canAfford = character.xpCur >= cost;
                const schedule = buildCostSchedule('petty', wpBonus, currentCount);
                return (
                  <div className={styles.talentCardInCareer}>
                    <div className={styles.talentName}>Petty Spells</div>
                    <div className={styles.talentMeta}>
                      Memorised: {currentCount} | WP Bonus: {wpBonus}
                    </div>
                    <div className={styles.talentMeta}>
                      {schedule.map((s, i) => (
                        <span key={i} style={s.current ? { fontWeight: 'bold', textDecoration: 'underline' } : undefined}>
                          {i > 0 && ' → '}{s.cost} XP{s.from !== s.to - 1 ? ` (spells ${s.from + 1}–${s.to})` : ` (spell ${s.from + 1})`}
                        </span>
                      ))}
                    </div>
                    <div className={styles.talentMeta}>
                      Next spell costs: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                    </div>
                    <button type="button" disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}
                      onClick={() => { setSpellLearningType('petty'); setShowSpellLearningPicker(true); }}>
                      Learn Petty Spell ({cost} XP)
                    </button>
                  </div>
                );
              })()}
              {spellTypes.includes('arcane') && (() => {
                const currentCount = counts.arcane;
                const cost = getSpellLearningCost('arcane', currentCount, intBonus);
                const canAfford = character.xpCur >= cost;
                const loreName = character.talents.find(t => t.n.startsWith('Arcane Magic'))?.n ?? 'Arcane Magic';
                const schedule = buildCostSchedule('arcane', intBonus, currentCount);
                return (
                  <div className={styles.talentCardInCareer}>
                    <div className={styles.talentName}>{loreName} Spells</div>
                    <div className={styles.talentMeta}>
                      Memorised: {currentCount} | Int Bonus: {intBonus}
                    </div>
                    <div className={styles.talentMeta}>
                      {schedule.map((s, i) => (
                        <span key={i} style={s.current ? { fontWeight: 'bold', textDecoration: 'underline' } : undefined}>
                          {i > 0 && ' → '}{s.cost} XP{s.from !== s.to - 1 ? ` (spells ${s.from + 1}–${s.to})` : ` (spell ${s.from + 1})`}
                        </span>
                      ))}
                    </div>
                    <div className={styles.talentMeta}>
                      Next spell costs: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                    </div>
                    <button type="button" disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}
                      onClick={() => { setSpellLearningType('arcane'); setShowSpellLearningPicker(true); }}>
                      Learn Arcane Spell ({cost} XP)
                    </button>
                  </div>
                );
              })()}
              {spellTypes.includes('miracle') && (() => {
                const currentCount = counts.miracle;
                const cost = getSpellLearningCost('miracle', currentCount, 0);
                const canAfford = character.xpCur >= cost;
                const loreName = character.talents.find(t => t.n.startsWith('Invoke'))?.n ?? 'Invoke';
                return (
                  <div className={styles.talentCardInCareer}>
                    <div className={styles.talentName}>{loreName} — Miracles</div>
                    <div className={styles.talentMeta}>
                      Memorised: {currentCount} | Cost: 100 XP × miracles known
                    </div>
                    <div className={styles.talentMeta}>
                      {currentCount === 0 ? 'First miracle: ' : `Next miracle (#${currentCount + 1}): `}
                      <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                      {currentCount > 0 && ` (100 × ${currentCount})`}
                    </div>
                    <button type="button" disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}
                      onClick={() => { setSpellLearningType('miracle'); setShowSpellLearningPicker(true); }}>
                      Learn Miracle ({cost} XP)
                    </button>
                  </div>
                );
              })()}
              {spellTypes.includes('chaos') && (() => {
                const currentCount = counts.arcane + counts.petty;
                const cost = getSpellLearningCost('chaos', currentCount, 0);
                const canAfford = character.xpCur >= cost;
                const loreName = character.talents.find(t => t.n.startsWith('Chaos Magic'))?.n ?? 'Chaos Magic';
                return (
                  <div className={styles.talentCardInCareer}>
                    <div className={styles.talentName}>{loreName} Spells</div>
                    <div className={styles.talentMeta}>
                      Always 100 XP per spell (plus 1 Corruption point)
                    </div>
                    <div className={styles.talentMeta}>
                      Next spell: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{cost} XP</span>
                    </div>
                    <button type="button" disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}
                      onClick={() => { setSpellLearningType('chaos'); setShowSpellLearningPicker(true); }}>
                      Learn Chaos Spell ({cost} XP)
                    </button>
                  </div>
                );
              })()}
            </div>
          </Card>
        );
      })()}

      {/* Ritual Learning */}
      {hasRitualMagicTalent(character) && (() => {
        const characterLore = getCharacterLore(character);
        const learnedRitualNames = new Set((character.rituals ?? []).map(r => r.name));

        // Filter rituals by character's lore
        const availableRituals = RITUAL_LIST.filter(r => {
          if (learnedRitualNames.has(r.name)) return false;
          // "Any" or "Any Lore" rituals are always available
          if (r.type === 'Any' || r.type === 'Any Lore') return true;
          // "Any Lore of the Eight Winds" is available to any Arcane Magic holder
          if (r.type === 'Any Lore of the Eight Winds') {
            return character.talents.some(t => t.n.startsWith('Arcane Magic'));
          }
          // Check if the ritual's type matches the character's lore
          if (!characterLore) return false;
          // Direct lore match: "Lore of Beasts" matches talent "Arcane Magic (Beasts)"
          if (r.type.includes(characterLore) || r.type.includes(`Lore of ${characterLore}`)) return true;
          return false;
        });

        return (
          <Card>
            <SectionHeader icon={ScrollText} title="Learn Rituals" />
            <div className={styles.talentHelpText}>
              Rituals cost their listed Learning XP to acquire. Available rituals depend on your Lore.
            </div>
            {(character.rituals ?? []).length > 0 && (
              <>
                <div className={styles.talentGroupLabelInCareer}>Known Rituals ({(character.rituals ?? []).length})</div>
                <div className={styles.talentGrid}>
                  {(character.rituals ?? []).map(r => (
                    <div key={r.name} className={styles.talentCardInCareer}>
                      <div className={styles.talentName}>{r.name}</div>
                      <div className={styles.talentMeta}>CN {r.cn} | {r.type}</div>
                      <div className={styles.talentMeta}>{r.description}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {availableRituals.length > 0 && (
              <>
                <div className={styles.talentGroupLabelOutCareer}>Available Rituals ({availableRituals.length})</div>
                <div className={styles.talentGrid}>
                  {availableRituals.map(r => {
                    const canAfford = character.xpCur >= r.learningXP;
                    return (
                      <div key={r.name} className={styles.talentCardOutCareer}>
                        <div className={styles.talentName}>{r.name}</div>
                        <div className={styles.talentMeta}>CN {r.cn} | {r.type}</div>
                        <div className={styles.talentMeta}>{r.description}</div>
                        <div className={styles.talentMeta}>
                          Cost: <span className={canAfford ? styles.canAfford : styles.cannotAfford}>{r.learningXP} XP</span>
                        </div>
                        <button type="button" onClick={() => handleLearnRitual(r)} disabled={!canAfford} className={canAfford ? styles.talentAcquireBtn : styles.talentAcquireBtnDisabled}>
                          Learn ({r.learningXP} XP)
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {availableRituals.length === 0 && (character.rituals ?? []).length === 0 && (
              <div className={styles.talentMeta}>No rituals available for your Lore.</div>
            )}
          </Card>
        );
      })()}

      {/* Career Scheme Display */}
      {scheme && (
        <Card>
          <SectionHeader icon={ScrollText} title="Career Scheme" />
          <div className={styles.schemeGrid}>
            {allLevels.map((level, i) => (
              <div key={i} className={level.title === character.careerLevel ? styles.schemeLevelCardActive : styles.schemeLevelCard}>
                <div className={styles.schemeLevelTitle}>{level.title}</div>
                <div className={styles.schemeLevelStatus}>{level.status}</div>
                <div className={styles.schemeLevelDetails}>
                  <div><strong>Chars:</strong> {level.characteristics.join(', ')}</div>
                  <div><strong>Skills:</strong> {level.skills.join(', ')}</div>
                  <div><strong>Talents:</strong> {level.talents.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Advancement Log */}
      <Card>
        <SectionHeader icon={ScrollText} title="Advancement Log" action={
          <div className={styles.logActions}>
            <button type="button" onClick={handleUndo} disabled={character.advancementLog.length === 0} className={character.advancementLog.length === 0 ? styles.logBtnDisabled : styles.logBtn} aria-label="Undo last advancement">
              <Undo2 size={14} />
            </button>
            <button type="button" onClick={handleRedo} disabled={redoStack.length === 0} className={redoStack.length === 0 ? styles.logBtnDisabled : styles.logBtn} aria-label="Redo last undone advancement">
              <Redo2 size={14} />
            </button>
            <button type="button" onClick={() => setShowLog(!showLog)} className={styles.logBtn}>
              {showLog ? 'Hide' : 'Show'} ({character.advancementLog.length})
            </button>
          </div>
        } />
        {showLog && (
          <table className={styles.tableBase}>
            <thead>
              <tr>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>From→To</th>
                <th className={styles.th}>XP</th>
                <th className={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...character.advancementLog].reverse().map((entry, i) => (
                <tr key={i}>
                  <td className={styles.td}>{entry.type}</td>
                  <td className={styles.td}>{entry.name}</td>
                  <td className={styles.td}>{entry.from}→{entry.to}</td>
                  <td className={styles.td}>{entry.xpCost}</td>
                  <td className={entry.inCareer ? styles.logStatusInCareer : styles.logStatusOutCareer}>{entry.inCareer ? 'In' : 'Out'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Archive Section */}
      <Card>
        <SectionHeader icon={ScrollText} title="Archive" action={
          <div className={styles.logActions}>
            {character.advancementLogArchive.length > 0 && (
              <button type="button" onClick={() => setShowClearConfirm(true)} className={styles.logBtn}>
                Clear Archive
              </button>
            )}
            <button type="button" onClick={() => setShowArchive(!showArchive)} className={styles.logBtn}>
              {showArchive ? 'Hide' : 'Show'} Archive ({character.advancementLogArchive.length})
            </button>
          </div>
        } />
        {showArchive && (
          character.advancementLogArchive.length === 0 ? (
            <p className={styles.archiveEmptyMessage}>
              No archived entries. Entries are automatically archived when the active log exceeds 100 entries.
            </p>
          ) : (
            <table className={styles.tableBase}>
              <thead>
                <tr>
                  <th className={styles.th}>Type</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>From→To</th>
                  <th className={styles.th}>XP</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {[...character.advancementLogArchive].reverse().map((entry, i) => {
                  const originalIndex = character.advancementLogArchive.length - 1 - i;
                  return (
                    <tr key={originalIndex}>
                      <td className={styles.td}>{entry.type}</td>
                      <td className={styles.td}>{entry.name}</td>
                      <td className={styles.td}>{entry.from}→{entry.to}</td>
                      <td className={styles.td}>{entry.xpCost}</td>
                      <td className={entry.inCareer ? styles.logStatusInCareer : styles.logStatusOutCareer}>
                        {entry.inCareer ? 'In' : 'Out'}
                      </td>
                      <td className={styles.td}>
                        <button type="button" onClick={() => handleRestoreEntry(originalIndex)} className={styles.logBtn}>
                          Restore
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </Card>

      {showClearConfirm && (
        <ConfirmDialog
          message="Clear all archived advancement entries? This cannot be undone."
          confirmLabel="Clear Archive"
          onConfirm={handleClearArchive}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* Pickers */}
      {showClassPicker && (
        <Picker items={[...CAREER_CLASS_LIST]} getLabel={(c) => c} onSelect={handleClassSelect} onClose={() => setShowClassPicker(false)} title="Select Class" />
      )}
      {showCareerPicker && (
        <Picker items={careerNames} getLabel={(c) => c} onSelect={handleCareerSelect} onClose={() => setShowCareerPicker(false)} title="Select Career" />
      )}
      {showLevelPicker && (
        <Picker items={levelTitles} getLabel={(t) => t} onSelect={handleLevelSelect} onClose={() => setShowLevelPicker(false)} title="Select Level" />
      )}
      {showSwitchCareerPicker && (
        <Picker items={getEligibleCareers(character.species).filter(c => c !== character.career)} getLabel={(c) => c} getGroup={(c) => { const s = getCareerScheme(c); return s ? s.class : 'Other'; }} onSelect={handleSwitchCareer} onClose={() => setShowSwitchCareerPicker(false)} title="Switch to Career" />
      )}
      {showSpellLearningPicker && (
        <SpellPicker
          spells={getEligibleSpells(SPELL_LIST, spellLearningType, character.talents, character.species)}
          characterTalents={character.talents}
          knownSpellNames={new Set(character.spells.map(s => s.name))}
          onSelect={handleLearnSpell}
          onClose={() => setShowSpellLearningPicker(false)}
          title={`Learn ${spellLearningType === 'petty' ? 'Petty Spell' : spellLearningType === 'arcane' ? 'Arcane Spell' : spellLearningType === 'miracle' ? 'Miracle' : 'Chaos Spell'}`}
        />
      )}

      {activeTooltip && (
        <Tooltip
          id={`tooltip-${activeTooltip.type}-${activeTooltip.key}`}
          anchorEl={activeTooltip.anchorEl}
          title={activeTooltip.content.title}
          onClose={() => setActiveTooltip(null)}
        >
          {activeTooltip.content.sections.map((s) => (
            <div key={s.label}>
              <strong className={styles.tooltipSectionLabel}>{s.label}</strong>
              <p className={styles.tooltipSectionText}>{s.text}</p>
            </div>
          ))}
        </Tooltip>
      )}

      <Toast message={xpToastMessage} duration={3000} />
    </div>
  );
}

export default AdvancementPage;
