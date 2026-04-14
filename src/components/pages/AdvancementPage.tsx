import { useState } from 'react';
import type { Character, ArmourPoints, CharacteristicKey, CareerLevel, AdvancementEntry } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { Picker } from '../shared/Picker';
import { Tooltip } from '../shared/Tooltip';
import { CAREER_SCHEMES, CAREER_CLASS_LIST } from '../../data/careers';
import { getCareersByClass, getCareerScheme } from '../../logic/careers';
import { getAdvancementCost, calculateBulkAdvancement, advanceCharacteristic, advanceSkill, isCareerLevelComplete, careerSkillMatches, undoAdvancement, redoAdvancement } from '../../logic/advancement';
import { getBonus } from '../../logic/calculators';
import { TALENT_DB } from '../../data/talents';
import { resolveTalentTooltip, resolveSkillTooltip } from '../../logic/tooltip-content';
import type { TooltipContent } from '../../logic/tooltip-content';
import { RuneLearningPanel } from '../shared/RuneLearningPanel';
import { GraduationCap, TrendingUp, ScrollText, CheckCircle, Swords, BookOpen, Sparkles, Undo2, Redo2 } from 'lucide-react';

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
const sectionGap = { display: 'flex', flexDirection: 'column' as const, gap: '16px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' };
const thStyle = { padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' as const, fontSize: '11px', textTransform: 'uppercase' as const };
const tdStyle = { padding: '4px 8px', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.05))' };
const smallBtn = { padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' };

const inCareerBg = 'rgba(76, 175, 80, 0.1)';
const inCareerBorder = '1px solid rgba(76, 175, 80, 0.4)';
const outCareerBg = 'rgba(201, 168, 76, 0.1)';
const outCareerBorder = '1px solid rgba(201, 168, 76, 0.4)';

export function AdvancementPage({ character, update, updateCharacter }: AdvancementPageProps) {
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showCareerPicker, setShowCareerPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSwitchCareerPicker, setShowSwitchCareerPicker] = useState(false);
  const [redoStack, setRedoStack] = useState<AdvancementEntry[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);

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

  const scheme = getCareerScheme(character.career);
  const careerLevel = scheme
    ? ([scheme.level1, scheme.level2, scheme.level3, scheme.level4] as CareerLevel[]).find(l => l.title === character.careerLevel)
    : undefined;
  const careerLevelNum = scheme
    ? [scheme.level1, scheme.level2, scheme.level3, scheme.level4].findIndex(l => l.title === character.careerLevel) + 1
    : 0;
  const isComplete = scheme && careerLevelNum > 0 ? isCareerLevelComplete(character, character.career, careerLevelNum) : false;

  const careerChars = careerLevel?.characteristics ?? [];
  const careerSkills = careerLevel?.skills ?? [];
  const careerTalents = careerLevel?.talents ?? [];

  // Career progress analysis — WFRP 4e completion thresholds: Level 1=5, 2=10, 3=15, 4=20
  const completionThreshold = ({ 1: 5, 2: 10, 3: 15, 4: 20 } as Record<number, number>)[careerLevelNum] ?? 5;
  const isMaxLevel = careerLevelNum >= 4;
  const charsProgress = careerChars.map(k => ({ name: k, advances: character.chars[k].a, met: character.chars[k].a >= completionThreshold }));
  const charsMet = charsProgress.every(c => c.met);
  const allSkills = [...character.bSkills, ...character.aSkills];
  const skillsWithAdvances = careerSkills.filter(sn => allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= completionThreshold));
  const skillsMet = skillsWithAdvances.length >= Math.min(8, careerSkills.length);
  const talentsOwned = careerTalents.filter(tn => character.talents.some(t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' (')));
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
    updateCharacter((c) => ({
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
    }));
    setRedoStack([]);
  };

  // Switch career
  const handleSwitchCareer = (newCareer: string) => {
    const newScheme = getCareerScheme(newCareer);
    if (!newScheme || newCareer === character.career) { setShowSwitchCareerPicker(false); return; }
    const sameClass = newScheme.class === character.class;
    const switchCost = (readyToProgress ? 100 : 200) + (sameClass ? 0 : 100);
    if (character.xpCur < switchCost) { setShowSwitchCareerPicker(false); return; }
    updateCharacter((c) => ({
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
    }));
    setRedoStack([]);
    setShowSwitchCareerPicker(false);
  };

  // Career pickers
  const handleClassSelect = (cls: string) => { update('class', cls); setShowClassPicker(false); };
  const handleCareerSelect = (career: string) => {
    const s = getCareerScheme(career);
    if (s) {
      updateCharacter((c) => ({ ...c, career, class: s.class, careerLevel: s.level1.title, status: s.level1.status }));
    }
    setShowCareerPicker(false);
  };
  const handleLevelSelect = (levelTitle: string) => {
    if (!scheme) return;
    const level = [scheme.level1, scheme.level2, scheme.level3, scheme.level4].find(l => l.title === levelTitle);
    if (level) updateCharacter((c) => ({ ...c, careerLevel: level.title, status: level.status }));
    setShowLevelPicker(false);
  };

  // Advance characteristic
  const handleAdvanceChar = (key: CharacteristicKey) => {
    const inCareer = careerChars.includes(key);
    updateCharacter((c) => advanceCharacteristic(c, key, inCareer));
    setRedoStack([]);
  };

  const handleBulkAdvanceChar = (key: CharacteristicKey) => {
    const inCareer = careerChars.includes(key);
    const currentAdv = character.chars[key].a;
    const bulk = calculateBulkAdvancement('characteristic', currentAdv, character.xpCur, inCareer, 5);
    if (bulk.count === 0) return;
    updateCharacter((c) => {
      let updated = { ...c };
      for (let i = 0; i < bulk.count; i++) {
        updated = advanceCharacteristic(updated, key, inCareer);
      }
      return updated;
    });
    setRedoStack([]);
  };

  // Advance skill
  const handleAdvanceSkill = (skillIndex: number, isBasic: boolean) => {
    const skills = isBasic ? character.bSkills : character.aSkills;
    const skill = skills[skillIndex];
    const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
    updateCharacter((c) => advanceSkill(c, skillIndex, isBasic, inCareer));
    setRedoStack([]);
  };

  const handleBulkAdvanceSkill = (skillIndex: number, isBasic: boolean, count: number) => {
    const skills = isBasic ? character.bSkills : character.aSkills;
    const skill = skills[skillIndex];
    const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
    const bulk = calculateBulkAdvancement('skill', skill.a, character.xpCur, inCareer, count);
    if (bulk.count === 0) return;
    updateCharacter((c) => {
      let updated = { ...c };
      for (let i = 0; i < bulk.count; i++) {
        updated = advanceSkill(updated, skillIndex, isBasic, inCareer);
      }
      return updated;
    });
    setRedoStack([]);
  };

  // Acquire talent using the WFRP 4e cost: 100 × (times taken + 1) in-career, doubled out
  const handleAcquireTalent = (talentName: string) => {
    const inCareer = careerTalents.some(ct => talentName === ct || talentName.startsWith(ct + ' (') || ct.startsWith(talentName + ' ('));
    updateCharacter((c) => {
      const existing = c.talents.find(t => t.n === talentName);
      const timesTaken = existing ? existing.lvl : 0;
      const cost = getAdvancementCost('talent', timesTaken, inCareer);
      if (c.xpCur < cost) return c;
      const newTalents = [...c.talents];
      if (existing) {
        const idx = newTalents.findIndex(t => t.n === talentName);
        newTalents[idx] = { ...existing, lvl: existing.lvl + 1 };
      } else {
        newTalents.push({ n: talentName, lvl: 1, desc: TALENT_DB.find(t => t.name === talentName)?.desc ?? '' });
      }
      return {
        ...c,
        talents: newTalents,
        xpCur: c.xpCur - cost,
        xpSpent: c.xpSpent + cost,
        advancementLog: [...c.advancementLog, {
          timestamp: Date.now(), type: 'talent', name: talentName,
          from: timesTaken, to: timesTaken + 1, xpCost: cost,
          careerLevel: c.careerLevel, inCareer,
        }],
      };
    });
    setRedoStack([]);
  };

  const careerNames = character.class ? getCareersByClass(character.class) : Object.keys(CAREER_SCHEMES);
  const levelTitles = scheme ? [scheme.level1.title, scheme.level2.title, scheme.level3.title, scheme.level4.title] : [];

  return (
    <div style={sectionGap}>
      {/* Career Selection */}
      <Card>
        <SectionHeader icon={GraduationCap} title="Career" action={
          isComplete ? <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}><CheckCircle size={14} /> Complete</span> : undefined
        } />
        <div style={gridStyle}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Class</span>
            <button type="button" onClick={() => setShowClassPicker(true)} style={{ ...smallBtn, width: '100%', textAlign: 'left' }}>{character.class || 'Select Class'}</button>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Career</span>
            <button type="button" onClick={() => setShowCareerPicker(true)} style={{ ...smallBtn, width: '100%', textAlign: 'left' }}>{character.career || 'Select Career'}</button>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Level</span>
            <button type="button" onClick={() => setShowLevelPicker(true)} style={{ ...smallBtn, width: '100%', textAlign: 'left' }}>{character.careerLevel || 'Select Level'}</button>
          </div>
          <EditableField label="Status" value={character.status} onSave={(v) => update('status', v)} />
        </div>
      </Card>

      {/* XP Tracking */}
      <Card>
        <SectionHeader icon={TrendingUp} title="Experience Points" />
        <div style={gridStyle}>
          <EditableField label="Current XP" value={character.xpCur} type="number" onSave={(v) => update('xpCur', v)} />
          <EditableField label="Spent XP" value={character.xpSpent} type="number" onSave={(v) => update('xpSpent', v)} />
          <EditableField label="Total XP" value={character.xpTotal} type="number" onSave={(v) => update('xpTotal', v)} />
        </div>
      </Card>

      {/* Career Progress */}
      {scheme && (
        <Card>
          <SectionHeader icon={CheckCircle} title="Career Progress" />
          <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>
              {character.career} — {character.careerLevel}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Level {careerLevelNum} • {character.class} • {character.status}</div>
          </div>

          {!isMaxLevel && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: charsMet ? 'var(--success)' : 'var(--accent-gold)', fontWeight: 600, marginBottom: '6px' }}>
                {charsMet ? '✓' : '✗'} Characteristics ({charsProgress.filter(c => c.met).length}/{charsProgress.length} at {completionThreshold}+ advances)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                {charsProgress.map((c) => (
                  <span key={c.name} title={CHAR_FULL_NAMES[c.name as CharacteristicKey] || c.name} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', background: c.met ? 'rgba(90,154,90,0.15)' : 'rgba(201,168,76,0.1)', border: `1px solid ${c.met ? 'var(--success)' : 'var(--border)'}`, color: c.met ? 'var(--success)' : 'var(--text-muted)' }}>
                    {c.name}: {c.advances}/{completionThreshold} {c.met ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: skillsMet ? 'var(--success)' : 'var(--accent-gold)', fontWeight: 600, marginBottom: '6px' }}>
                {skillsMet ? '✓' : '✗'} Skills: {skillsWithAdvances.length}/{Math.min(8, careerSkills.length)} needed at {completionThreshold}+ advances
              </div>
              <div style={{ fontSize: '12px', color: talentsMet ? 'var(--success)' : 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>
                {talentsMet ? '✓' : '✗'} Talent: {talentsOwned.length > 0 ? talentsOwned.join(', ') : 'none acquired'}
              </div>
              {readyToProgress && (
                <div style={{ padding: '8px 12px', background: 'rgba(90,154,90,0.15)', border: '1px solid var(--success)', borderRadius: '4px', fontSize: '12px', color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>
                  ✓ Ready to advance!
                </div>
              )}
            </div>
          )}

          {isMaxLevel && (
            <div style={{ padding: '8px 12px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--accent-gold)', borderRadius: '4px', fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
              Max Level Reached
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!isMaxLevel && (
              <button type="button" onClick={handleAdvanceLevel} disabled={!canAffordAdvance} style={{
                flex: '1 1 auto', minWidth: '200px', padding: '12px 20px', borderRadius: '6px',
                fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', cursor: canAffordAdvance ? 'pointer' : 'not-allowed',
                background: (readyToProgress && canAffordAdvance) ? 'rgba(90,154,90,0.3)' : 'var(--bg-tertiary)',
                border: (readyToProgress && canAffordAdvance) ? '2px solid var(--success)' : '1px solid var(--border)',
                color: (readyToProgress && canAffordAdvance) ? '#fff' : 'var(--text-muted)',
                opacity: canAffordAdvance ? 1 : 0.6,
              }}>
                Advance Career Level ({advanceLevelCost} XP)
              </button>
            )}
            <button type="button" onClick={() => setShowSwitchCareerPicker(true)} style={{
              flex: '1 1 auto', minWidth: '200px', padding: '12px 20px', borderRadius: '6px',
              fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
              background: 'rgba(201,168,76,0.2)', border: '2px solid var(--accent-gold)', color: 'var(--accent-gold)',
            }}>
              Switch Career
            </button>
          </div>
        </Card>
      )}

      {/* Characteristics Advancement */}
      <Card>
        <SectionHeader icon={Swords} title="Advance Characteristics" />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          <span style={{ color: 'var(--success)' }}>In-Career</span> costs follow the WFRP 4e tiered table. <span style={{ color: 'var(--accent-gold)' }}>Out-of-Career</span> costs are double.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
          {CHAR_KEYS.map((key) => {
            const c = character.chars[key];
            const inCareer = careerChars.includes(key);
            const currentValue = c.i + c.a;
            const cost = getAdvancementCost('characteristic', c.a, inCareer);
            const canAfford = character.xpCur >= cost;
            const bulk = calculateBulkAdvancement('characteristic', c.a, character.xpCur, inCareer, 5);
            return (
              <div key={key} style={{
                background: inCareer ? inCareerBg : outCareerBg,
                border: inCareer ? inCareerBorder : outCareerBorder,
                borderRadius: '6px', padding: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 700, color: inCareer ? 'var(--success)' : 'var(--accent-gold)' }} title={CHAR_FULL_NAMES[key]}>{key}</span>
                  <span style={{ fontSize: '10px', color: inCareer ? 'var(--success)' : 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 600 }}>{inCareer ? 'In-Career' : 'Out-of-Career'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Value: <strong style={{ color: 'var(--parchment)' }}>{currentValue}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Advances: <strong>{c.a}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Next: <strong style={{ color: canAfford ? 'var(--success)' : 'var(--danger)' }}>{cost} XP</strong></span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={() => handleAdvanceChar(key)} disabled={!canAfford} style={{ ...smallBtn, flex: 1, background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>+1 ({cost} XP)</button>
                  {bulk.count > 1 && (
                    <button type="button" onClick={() => handleBulkAdvanceChar(key)} style={{ ...smallBtn, flex: 1 }}>+{bulk.count} ({bulk.totalCost} XP)</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Skills Advancement */}
      <Card>
        <SectionHeader icon={BookOpen} title="Advance Skills" />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          <span style={{ color: 'var(--success)' }}>In-Career</span> skills use the tiered cost table. <span style={{ color: 'var(--accent-gold)' }}>Out-of-Career</span> costs are double.
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Skill</th>
              <th style={thStyle}>Char</th>
              <th style={thStyle}>Adv</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Cost</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {character.bSkills.map((skill, i) => {
              const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? getBonus(charVal.i + charVal.a + charVal.b) + skill.a : skill.a;
              const cost = getAdvancementCost('skill', skill.a, inCareer);
              const canAfford = character.xpCur >= cost;
              return (
                <tr key={`b-${i}`} style={{ background: inCareer ? 'rgba(76,175,80,0.05)' : 'transparent' }}>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={(e) => handleSkillTooltip(skill.n, skill.c, e)}
                      aria-describedby={
                        activeTooltip?.type === 'skill' && activeTooltip.key === skill.n
                          ? `tooltip-skill-${skill.n}`
                          : undefined
                      }
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'help', color: 'inherit', font: 'inherit', textAlign: 'left' }}
                    >{skill.n}</button>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{skill.c}</td>
                  <td style={tdStyle}>{skill.a}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{total}</td>
                  <td style={{ ...tdStyle, color: canAfford ? 'var(--success)' : 'var(--danger)' }}>{cost} XP</td>
                  <td style={{ ...tdStyle, fontSize: '10px', color: inCareer ? 'var(--success)' : 'var(--accent-gold)' }}>{inCareer ? 'In' : 'Out'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button type="button" onClick={() => handleAdvanceSkill(i, true)} disabled={!canAfford} style={{ ...smallBtn, padding: '2px 6px', fontSize: '11px', background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>+1</button>
                      <button type="button" onClick={() => handleBulkAdvanceSkill(i, true, 5)} disabled={!canAfford} style={{ ...smallBtn, padding: '2px 6px', fontSize: '11px', background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>+5</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {character.aSkills.filter(s => s.n !== '').map((skill, i) => {
              const realIndex = character.aSkills.indexOf(skill);
              const inCareer = careerSkills.some(cs => careerSkillMatches(cs, skill.n));
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? getBonus(charVal.i + charVal.a + charVal.b) + skill.a : skill.a;
              const cost = getAdvancementCost('skill', skill.a, inCareer);
              const canAfford = character.xpCur >= cost;
              return (
                <tr key={`a-${i}`} style={{ background: inCareer ? 'rgba(76,175,80,0.05)' : 'transparent' }}>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={(e) => handleSkillTooltip(skill.n, skill.c, e)}
                      aria-describedby={
                        activeTooltip?.type === 'skill' && activeTooltip.key === skill.n
                          ? `tooltip-skill-${skill.n}`
                          : undefined
                      }
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'help', color: 'inherit', font: 'inherit', textAlign: 'left' }}
                    >{skill.n}</button> <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>*</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{skill.c}</td>
                  <td style={tdStyle}>{skill.a}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{total}</td>
                  <td style={{ ...tdStyle, color: canAfford ? 'var(--success)' : 'var(--danger)' }}>{cost} XP</td>
                  <td style={{ ...tdStyle, fontSize: '10px', color: inCareer ? 'var(--success)' : 'var(--accent-gold)' }}>{inCareer ? 'In' : 'Out'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button type="button" onClick={() => handleAdvanceSkill(realIndex, false)} disabled={!canAfford} style={{ ...smallBtn, padding: '2px 6px', fontSize: '11px', background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>+1</button>
                      <button type="button" onClick={() => handleBulkAdvanceSkill(realIndex, false, 5)} disabled={!canAfford} style={{ ...smallBtn, padding: '2px 6px', fontSize: '11px', background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>+5</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Talents Advancement */}
      <Card>
        <SectionHeader icon={Sparkles} title="Acquire Talents" />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Talent cost: 100 × (times taken + 1) XP for <span style={{ color: 'var(--success)' }}>in-career</span>, doubled for <span style={{ color: 'var(--accent-gold)' }}>out-of-career</span>.
        </div>
        {careerTalents.length > 0 && (
          <>
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px' }}>In-Career Talents</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {careerTalents.map((talentName) => {
                const existing = character.talents.find(t => t.n === talentName);
                const timesTaken = existing ? existing.lvl : 0;
                const cost = getAdvancementCost('talent', timesTaken, true);
                const canAfford = character.xpCur >= cost;
                return (
                  <div key={talentName} style={{
                    background: inCareerBg, border: inCareerBorder, borderRadius: '6px', padding: '8px 12px',
                    display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px',
                  }}>
                    <button
                      type="button"
                      onClick={(e) => handleTalentTooltip(talentName, existing?.desc ?? '', e)}
                      aria-describedby={
                        activeTooltip?.type === 'talent' && activeTooltip.key === talentName
                          ? `tooltip-talent-${talentName}`
                          : undefined
                      }
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--parchment)', background: 'none', border: 'none', padding: 0, cursor: 'help', textAlign: 'left', font: 'inherit' }}
                    >{talentName}</button>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Level: {timesTaken} | Next: <span style={{ color: canAfford ? 'var(--success)' : 'var(--danger)' }}>{cost} XP</span>
                    </div>
                    <button type="button" onClick={() => handleAcquireTalent(talentName)} disabled={!canAfford} style={{ ...smallBtn, padding: '2px 8px', fontSize: '11px', marginTop: '2px', background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>
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
            <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '6px' }}>Out-of-Career Talents (owned)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {character.talents.filter(t => !careerTalents.includes(t.n)).map((talent) => {
                const cost = getAdvancementCost('talent', talent.lvl, false);
                const canAfford = character.xpCur >= cost;
                return (
                  <div key={talent.n} style={{
                    background: outCareerBg, border: outCareerBorder, borderRadius: '6px', padding: '8px 12px',
                    display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px',
                  }}>
                    <button
                      type="button"
                      onClick={(e) => handleTalentTooltip(talent.n, talent.desc ?? '', e)}
                      aria-describedby={
                        activeTooltip?.type === 'talent' && activeTooltip.key === talent.n
                          ? `tooltip-talent-${talent.n}`
                          : undefined
                      }
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--parchment)', background: 'none', border: 'none', padding: 0, cursor: 'help', textAlign: 'left', font: 'inherit' }}
                    >{talent.n}</button>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Level: {talent.lvl} | Next: <span style={{ color: canAfford ? 'var(--success)' : 'var(--danger)' }}>{cost} XP</span>
                    </div>
                    <button type="button" onClick={() => handleAcquireTalent(talent.n)} disabled={!canAfford} style={{ ...smallBtn, padding: '2px 8px', fontSize: '11px', marginTop: '2px', background: canAfford ? 'var(--bg-tertiary)' : 'var(--border)', color: canAfford ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      +1 Level ({cost} XP)
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {character.talents.some(t => t.n === 'Rune Magic' || t.n === 'Master Rune Magic') && (
        <RuneLearningPanel character={character} updateCharacter={updateCharacter} />
      )}

      {/* Career Scheme Display */}
      {scheme && (
        <Card>
          <SectionHeader icon={ScrollText} title="Career Scheme" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {([scheme.level1, scheme.level2, scheme.level3, scheme.level4]).map((level, i) => (
              <div key={i} style={{
                padding: '10px', borderRadius: 'var(--radius-sm)',
                background: level.title === character.careerLevel ? 'rgba(201,168,76,0.1)' : 'var(--bg-tertiary)',
                border: `1px solid ${level.title === character.careerLevel ? 'var(--accent-gold)' : 'var(--border)'}`,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--parchment)', marginBottom: '4px' }}>{level.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{level.status}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button type="button" onClick={handleUndo} disabled={character.advancementLog.length === 0} style={{ ...smallBtn, fontSize: '12px', opacity: character.advancementLog.length === 0 ? 0.4 : 1, cursor: character.advancementLog.length === 0 ? 'not-allowed' : 'pointer' }} aria-label="Undo last advancement">
              <Undo2 size={14} />
            </button>
            <button type="button" onClick={handleRedo} disabled={redoStack.length === 0} style={{ ...smallBtn, fontSize: '12px', opacity: redoStack.length === 0 ? 0.4 : 1, cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer' }} aria-label="Redo last undone advancement">
              <Redo2 size={14} />
            </button>
            <button type="button" onClick={() => setShowLog(!showLog)} style={{ ...smallBtn, fontSize: '12px' }}>
              {showLog ? 'Hide' : 'Show'} ({character.advancementLog.length})
            </button>
          </div>
        } />
        {showLog && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>From→To</th>
                <th style={thStyle}>XP</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...character.advancementLog].reverse().map((entry, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{entry.type}</td>
                  <td style={tdStyle}>{entry.name}</td>
                  <td style={tdStyle}>{entry.from}→{entry.to}</td>
                  <td style={tdStyle}>{entry.xpCost}</td>
                  <td style={{ ...tdStyle, fontSize: '10px', color: entry.inCareer ? 'var(--success)' : 'var(--accent-gold)' }}>{entry.inCareer ? 'In' : 'Out'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

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
        <Picker items={Object.keys(CAREER_SCHEMES).filter(c => c !== character.career)} getLabel={(c) => { const s = getCareerScheme(c); return s ? `${c} (${s.class})` : c; }} onSelect={handleSwitchCareer} onClose={() => setShowSwitchCareerPicker(false)} title="Switch to Career" />
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
              <strong style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{s.label}</strong>
              <p style={{ margin: '2px 0 8px' }}>{s.text}</p>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}
