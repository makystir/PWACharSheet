import { useState } from 'react';
import type { Character, CharacteristicKey, ArmourPoints, Skill, Talent, SpellItem } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Picker } from '../shared/Picker';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { RollHistoryPanel } from '../shared/RollHistoryPanel';
import { FortuneResolvePanel } from '../shared/FortuneResolvePanel';
import { CharacterPortrait } from '../shared/CharacterPortrait';
import { Tooltip } from '../shared/Tooltip';
import { applySpeciesData } from '../../logic/species';
import { SPECIES_OPTIONS } from '../../data/species';
import { SPELL_LIST } from '../../data/spells';
import { ADV_SKILL_DB } from '../../data/advanced-skills';
import { TALENT_DB } from '../../data/talents';
import { TRAPPING_LIST } from '../../data/trappings';
import { ANIMAL_TEMPLATES, TRAINED_SKILLS } from '../../data/animals';
import { CAREER_CLASS_LIST } from '../../data/careers';
import { getCareersByClass, getCareerScheme } from '../../logic/careers';
import { calculateMaxEncumbrance, calculateCoinWeight } from '../../logic/calculators';
import { resolveSkillTooltip, resolveTalentTooltip } from '../../logic/tooltip-content';
import { computeSkillTarget, computeCharacteristicTarget, type RollResult } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import { User, Swords, BookOpen, Sparkles, Wand2, PawPrint, Brain, Package, Coins, Scale, Footprints, Hammer } from 'lucide-react';
import { CorruptionCard } from '../shared/CorruptionCard';
import { getRuneById } from '../../logic/runes';
import { RUNE_CATALOGUE } from '../../data/runes';

interface CharacterPageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
  rollHistory?: RollHistoryEntry[];
  addRoll?: (result: RollResult) => void;
  clearHistory?: () => void;
}

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const CHAR_FULL_NAMES: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness',
  I: 'Initiative', Ag: 'Agility', Dex: 'Dexterity', Int: 'Intelligence',
  WP: 'Willpower', Fel: 'Fellowship',
};

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' };
const thStyle = { padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' as const, fontSize: '11px', textTransform: 'uppercase' as const };
const tdStyle = { padding: '4px 8px', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.05))' };
const sectionGap = { display: 'flex', flexDirection: 'column' as const, gap: '16px' };
const numInput: React.CSSProperties = { width: '50px', padding: '3px 4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center', display: 'block', margin: '0 auto' };
const diceBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1, opacity: 0.7 };
const tooltipTriggerBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' };

type CharSubTab = 'identity' | 'abilities' | 'gear' | 'notes';

const subTabStyle: React.CSSProperties = {
  display: 'flex', gap: '0', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '4px',
};

function subTabBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase',
    background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
    color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
    borderBottom: active ? '2px solid var(--accent-gold)' : '2px solid transparent',
    transition: 'all 0.15s',
  };
}

export function CharacterPage({ character, update, updateCharacter, rollHistory = [], addRoll, clearHistory }: CharacterPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<CharSubTab>('identity');
  const [hideUntrainedSkills, setHideUntrainedSkills] = useState(false);
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showAdvSkillPicker, setShowAdvSkillPicker] = useState(false);
  const [showTalentPicker, setShowTalentPicker] = useState(false);
  const [showTrappingPicker, setShowTrappingPicker] = useState(false);
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; index: number } | null>(null);
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);
  const [tooltip, setTooltip] = useState<{ type: 'skill' | 'talent'; index: number; anchorEl: HTMLElement } | null>(null);

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

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'aSkill') removeAdvancedSkill(deleteTarget.index);
    else if (deleteTarget.type === 'talent') removeTalent(deleteTarget.index);
    else if (deleteTarget.type === 'spell') removeSpell(deleteTarget.index);
    else if (deleteTarget.type === 'trapping') {
      updateCharacter((c) => ({ ...c, trappings: c.trappings.filter((_, i) => i !== deleteTarget.index) }));
      setDeleteTarget(null);
    } else if (deleteTarget.type === 'companion') {
      updateCharacter((c) => ({ ...c, companions: c.companions.filter((_, i) => i !== deleteTarget.index) }));
      setDeleteTarget(null);
    }
  };

  return (
    <div style={sectionGap}>
      {/* Sub-tab navigation */}
      <div style={subTabStyle}>
        <button type="button" style={subTabBtn(activeSubTab === 'identity')} onClick={() => setActiveSubTab('identity')}>Identity</button>
        <button type="button" style={subTabBtn(activeSubTab === 'abilities')} onClick={() => setActiveSubTab('abilities')}>Abilities</button>
        <button type="button" style={subTabBtn(activeSubTab === 'gear')} onClick={() => setActiveSubTab('gear')}>Gear &amp; Wealth</button>
        <button type="button" style={subTabBtn(activeSubTab === 'notes')} onClick={() => setActiveSubTab('notes')}>Notes</button>
      </div>

      {/* ═══ IDENTITY TAB ═══ */}
      {activeSubTab === 'identity' && (<>
      {/* Portrait + Personal Details row */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <CharacterPortrait
          portrait={character.portrait || ''}
          characterName={character.name}
          onUpload={(dataUrl) => update('portrait', dataUrl)}
          onRemove={() => update('portrait', '')}
        />
        <Card style={{ flex: 1 }}>
          <SectionHeader icon={User} title="Personal Details" />
          <div style={gridStyle}>
            <EditableField label="Name" value={character.name} onSave={(v) => update('name', v)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Species</span>
              <select
                value={character.species}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                style={{
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  minHeight: '28px',
                  cursor: 'pointer',
                }}
              >
                <option value="">— Select Species —</option>
                {SPECIES_OPTIONS.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class</span>
              <select value={character.class} onChange={(e) => handleClassChange(e.target.value)} style={{ padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', minHeight: '28px', cursor: 'pointer' }}>
                <option value="">— Select Class —</option>
                {CAREER_CLASS_LIST.map((cls) => (<option key={cls} value={cls}>{cls}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Career</span>
              <select value={character.career} onChange={(e) => handleCareerChange(e.target.value)} style={{ padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', minHeight: '28px', cursor: 'pointer' }}>
                <option value="">— Select Career —</option>
                {filteredCareers.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <EditableField label="Career Level" value={character.careerLevel} onSave={(v) => update('careerLevel', v)} />
            <EditableField label="Career Path" value={character.careerPath} onSave={(v) => update('careerPath', v)} />
            <EditableField label="Status" value={character.status} onSave={(v) => update('status', v)} />
            <EditableField label="Age" value={character.age} onSave={(v) => update('age', v)} />
            <EditableField label="Height" value={character.height} onSave={(v) => update('height', v)} />
            <EditableField label="Hair" value={character.hair} onSave={(v) => update('hair', v)} />
            <EditableField label="Eyes" value={character.eyes} onSave={(v) => update('eyes', v)} />
          </div>
        </Card>
      </div>

      {/* Characteristics */}
      <Card>
        <SectionHeader icon={Swords} title="Characteristics" />
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center' }} title="Characteristic">Char</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Initial</th>
                <th style={{ ...thStyle, textAlign: 'center' }} title="Advances">Advance</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Current</th>
                <th style={{ ...thStyle, textAlign: 'center' }} title="Talent Bonus">Bonus</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {CHAR_KEYS.map((key) => {
                const c = character.chars[key];
                const current = c.i + c.a + c.b;
                return (
                  <tr key={key}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--accent-gold)', textAlign: 'center' }} title={CHAR_FULL_NAMES[key]}>{key}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input type="number" value={c.i} onChange={(e) => update(`chars.${key}.i`, Number(e.target.value) || 0)} style={numInput} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input type="number" value={c.a} onChange={(e) => update(`chars.${key}.a`, Number(e.target.value) || 0)} style={numInput} />
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--parchment)', fontWeight: 600, textAlign: 'center', width: '50px' }}>{current}</td>
                    <td style={{ ...tdStyle, color: c.b > 0 ? 'var(--success)' : 'var(--text-muted)', fontSize: '12px', textAlign: 'center', width: '50px' }}>{c.b || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button type="button" style={diceBtn} onClick={() => openCharacteristicRoll(key)} title={`Roll ${CHAR_FULL_NAMES[key]}`} aria-label={`Roll ${CHAR_FULL_NAMES[key]}`}>🎲</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Movement, Fortune/Resolve */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
        <Card>
          <SectionHeader icon={Footprints} title="Movement" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <EditableField label="Move" value={character.move.m} type="number" onSave={(v) => update('move.m', v)} />
            <EditableField label="Walk" value={character.move.w} type="number" onSave={(v) => update('move.w', v)} />
            <EditableField label="Run" value={character.move.r} type="number" onSave={(v) => update('move.r', v)} />
          </div>
        </Card>
        <FortuneResolvePanel character={character} update={update} updateCharacter={updateCharacter} />
      </div>
      </>)}

      {/* ═══ ABILITIES TAB ═══ */}
      {activeSubTab === 'abilities' && (<>
      {/* Basic Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title="Basic Skills" action={
          <button type="button" onClick={() => setHideUntrainedSkills(!hideUntrainedSkills)} style={{ padding: '3px 10px', background: hideUntrainedSkills ? 'rgba(201,168,76,0.15)' : 'var(--bg-tertiary)', border: `1px solid ${hideUntrainedSkills ? 'var(--accent-gold)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: hideUntrainedSkills ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>
            {hideUntrainedSkills ? 'Show All' : 'Trained Only'}
          </button>
        } />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Skill</th>
              <th style={{ ...thStyle, textAlign: 'center' }} title="Linked Characteristic">Char</th>
              <th style={{ ...thStyle, textAlign: 'center' }} title="Advances">Adv</th>
              <th style={{ ...thStyle, textAlign: 'center' }} title="Characteristic + Advances">Total</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {character.bSkills.map((skill, i) => {
              if (hideUntrainedSkills && skill.a === 0) return null;
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={tooltipTriggerBtn}
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
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center' }} title={CHAR_FULL_NAMES[skill.c as CharacteristicKey] || skill.c}>{skill.c}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input type="number" value={skill.a} onChange={(e) => update(`bSkills.${i}.a`, Number(e.target.value) || 0)} style={numInput} />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'center' }}>{total}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button type="button" style={diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Advanced Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title="Advanced Skills" action={
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Rulebook" onClick={() => setShowAdvSkillPicker(true)} />
            <AddButton label="Add Custom" onClick={addCustomAdvancedSkill} />
          </div>
        } />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Skill</th>
              <th style={{ ...thStyle, textAlign: 'center' }} title="Linked Characteristic">Char</th>
              <th style={{ ...thStyle, textAlign: 'center' }} title="Advances">Adv</th>
              <th style={{ ...thStyle, textAlign: 'center' }} title="Characteristic + Advances">Total</th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {character.aSkills.map((skill, i) => {
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        style={{ ...tooltipTriggerBtn, fontSize: '12px', opacity: 0.6, flexShrink: 0 }}
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
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <EditableField label="" value={skill.c} onSave={(v) => updateAdvancedSkill(i, 'c', String(v))} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input type="number" value={skill.a} onChange={(e) => updateAdvancedSkill(i, 'a', Number(e.target.value) || 0)} style={numInput} />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'center' }}>{total}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button type="button" style={diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button type="button" onClick={() => setDeleteTarget({ type: 'aSkill', index: i })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
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
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Rulebook" onClick={() => setShowTalentPicker(true)} />
            <AddButton label="Add Custom" onClick={addCustomTalent} />
          </div>
        } />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Talent</th>
              <th style={thStyle}>Lvl</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {character.talents.map((t, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      style={{ ...tooltipTriggerBtn, fontSize: '12px', opacity: 0.6, flexShrink: 0 }}
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
                <td style={tdStyle}>
                  <EditableField label="" value={t.lvl} type="number" onSave={(v) => updateTalent(i, 'lvl', Number(v))} style={{ minWidth: '40px' }} />
                </td>
                <td style={tdStyle}>
                  <EditableField label="" value={t.desc} onSave={(v) => updateTalent(i, 'desc', String(v))} />
                </td>
                <td style={tdStyle}>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'talent', index: i })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Spells — only show if character has magic talents/skills or already has spells */}
      {(character.spells.length > 0 || character.talents.some(t =>
        t.n.includes('Magic') || t.n.includes('Pray') || t.n.includes('Invoke')
      ) || character.aSkills.some(s =>
        s.n.startsWith('Channelling') || s.n.startsWith('Language (Magick)')
      )) && (
      <Card>
        <SectionHeader icon={Wand2} title="Spells & Prayers" action={
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Rulebook" onClick={() => setShowSpellPicker(true)} />
            <AddButton label="Add Custom" onClick={addCustomSpell} />
          </div>
        } />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>CN</th>
              <th style={thStyle}>Range</th>
              <th style={thStyle}>Duration</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {character.spells.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={tdStyle}>
                  <EditableField label="" value={s.name} onSave={(v) => updateSpell(i, 'name', String(v))} />
                </td>
                <td style={tdStyle}>{s.cn}</td>
                <td style={tdStyle}>{s.range}</td>
                <td style={tdStyle}>{s.duration}</td>
                <td style={tdStyle}>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'spell', index: i })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      )}

      {/* Known Runes — only show if character has Rune Magic talent */}
      {character.talents.some(t => t.n === 'Rune Magic' || t.n === 'Master Rune Magic') && (
      <Card>
        <SectionHeader icon={Hammer} title="Known Runes" />
        {(character.knownRunes ?? []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
            No runes learned yet. Learn runes on the Advancement page.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(character.knownRunes ?? []).map((runeId) => {
              const rune = getRuneById(runeId);
              if (!rune) return null;
              return (
                <div key={runeId} style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--parchment)', fontWeight: 600 }}>{rune.name}</span>
                  {rune.isMaster && <span style={{ color: 'var(--accent-gold)', fontSize: '10px', marginLeft: '4px' }}>★</span>}
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>{rune.category}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0', marginTop: '8px' }}>
          {(character.knownRunes ?? []).length} / {RUNE_CATALOGUE.length} runes known
        </div>
      </Card>
      )}
      </>)}

      {/* ═══ GEAR & WEALTH TAB ═══ */}
      {activeSubTab === 'gear' && (<>
      {/* Trappings */}
      <Card>
        <SectionHeader icon={Package} title="Trappings" action={
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Rulebook" onClick={() => setShowTrappingPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, trappings: [...c.trappings, { name: '', enc: '0', quantity: 1 }] }))} />
          </div>
        } />
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Name</th><th style={thStyle} title="Encumbrance value — total Enc is shown in the Wealth & Encumbrance section">Enc</th><th style={thStyle}>Qty</th><th style={{ ...thStyle, textAlign: 'center' }} title="Stored on horse companion — excluded from character encumbrance">🐴</th><th style={thStyle}></th></tr></thead>
          <tbody>
            {character.trappings.map((t, i) => (
              <tr key={i} style={{ background: t.storedOnHorse ? 'rgba(200,168,76,0.05)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={tdStyle}><EditableField label="" value={t.name} onSave={(v) => update(`trappings.${i}.name`, v)} /></td>
                <td style={tdStyle}><EditableField label="" value={t.enc} onSave={(v) => update(`trappings.${i}.enc`, v)} style={{ minWidth: '40px' }} /></td>
                <td style={tdStyle}><EditableField label="" value={t.quantity} type="number" onSave={(v) => update(`trappings.${i}.quantity`, v)} style={{ minWidth: '40px' }} /></td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <input type="checkbox" checked={!!t.storedOnHorse} onChange={(e) => update(`trappings.${i}.storedOnHorse`, e.target.checked)} title="Stored on horse" style={{ cursor: 'pointer' }} />
                </td>
                <td style={tdStyle}><button type="button" onClick={() => setDeleteTarget({ type: 'trapping', index: i })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Wealth & Encumbrance */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <SectionHeader icon={Coins} title="Wealth" />
            <EditableField label="Gold Crowns (GC)" value={character.wGC} type="number" onSave={(v) => update('wGC', v)} />
            <EditableField label="Silver Shillings (SS)" value={character.wSS} type="number" onSave={(v) => update('wSS', v)} />
            <EditableField label="Brass Pennies (D)" value={character.wD} type="number" onSave={(v) => update('wD', v)} />
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
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Weapons</span><span>{eW}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Armour</span><span>{eA}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Trappings</span><span>{eT}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Coins</span><span>{eCoin}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '4px' }}>
                    <span style={{ color: over ? 'var(--danger)' : 'var(--parchment)', fontWeight: 600 }}>Total</span>
                    <span style={{ color: over ? 'var(--danger)' : 'var(--parchment)', fontWeight: 700 }}>{eTotal} / {maxEnc}</span>
                  </div>
                  {over && <div style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 600, textAlign: 'center' }}>⚠ Overburdened</div>}
                  {eHorse > 0 && (() => {
                    const packAnimal = character.companions.find(c => c.isPackAnimal);
                    const packName = packAnimal ? packAnimal.name || packAnimal.species : 'Pack Animal';
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '4px' }}>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>🐴 {packName}</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{eHorse}</span>
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
      {/* Animal Companions */}
      <Card>
        <SectionHeader icon={PawPrint} title="Animal Companions" action={
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Templates" onClick={() => setShowAnimalPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, companions: [...c.companions, { name: '', species: '', M: 0, WS: 0, BS: 0, S: 0, T: 0, I: 0, Ag: 0, Dex: 0, Int: 0, WP: 0, Fel: 0, W: 1, wCur: 1, traits: '', trained: [], notes: '' }] }))} />
          </div>
        } />
        {character.companions.map((comp, ci) => {
          const uc = (field: string, val: unknown) => update(`companions.${ci}.${field}`, val);
          const charKeys = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'] as const;
          return (
            <div key={ci} style={{ background: comp.isPackAnimal ? 'rgba(200,168,76,0.08)' : 'var(--bg-tertiary)', border: `1px solid ${comp.isPackAnimal ? 'var(--accent-gold)' : 'var(--border)'}`, borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                  <EditableField label="Name" value={comp.name} onSave={(v) => uc('name', v)} />
                  <EditableField label="Species" value={comp.species} onSave={(v) => uc('species', v)} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', color: comp.isPackAnimal ? 'var(--accent-gold)' : 'var(--text-muted)', whiteSpace: 'nowrap' }} title="Designate as pack animal — trappings marked 'stored on horse' will count toward this companion's encumbrance">
                    <input type="checkbox" checked={!!comp.isPackAnimal} onChange={(e) => {
                      // Only one pack animal at a time — unset others
                      if (e.target.checked) {
                        updateCharacter((c) => ({
                          ...c,
                          companions: c.companions.map((comp2, j) => ({ ...comp2, isPackAnimal: j === ci })),
                        }));
                      } else {
                        uc('isPackAnimal', false);
                      }
                    }} style={{ cursor: 'pointer' }} />
                    🐴 Pack Animal
                  </label>
                </div>
                <button type="button" onClick={() => setDeleteTarget({ type: 'companion', index: ci })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {charKeys.map((k) => (
                  <div key={k} style={{ textAlign: 'center', minWidth: '36px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--accent-gold)', fontWeight: 600 }}>{k}</div>
                    <EditableField label="" value={comp[k]} type="number" onSave={(v) => uc(k, v)} style={{ minWidth: '32px' }} />
                  </div>
                ))}
              </div>
              {/* Wound Tracking */}
              {(() => {
                const maxW = comp.W || 0;
                const curW = comp.wCur ?? maxW;
                const pct = maxW > 0 ? (curW / maxW) * 100 : 0;
                const wColor = pct > 50 ? 'var(--success)' : pct > 20 ? 'var(--accent-gold)' : 'var(--danger)';
                return (
                  <div style={{ marginBottom: '8px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, width: '50px' }}>Wounds</span>
                      <button type="button" onClick={() => uc('wCur', Math.max(0, curW - 1))} style={{ padding: '2px 8px', background: 'rgba(200,80,80,0.2)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>−</button>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ background: 'var(--bg-primary)', borderRadius: '3px', height: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: wColor, borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: wColor, fontFamily: 'var(--font-heading)', minWidth: '50px', textAlign: 'center' }}>{curW}/{maxW}</span>
                      <button type="button" onClick={() => uc('wCur', Math.min(maxW, curW + 1))} style={{ padding: '2px 8px', background: 'rgba(90,154,90,0.2)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>+</button>
                      <button type="button" onClick={() => uc('wCur', maxW)} style={{ padding: '2px 6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}>Full</button>
                    </div>
                  </div>
                );
              })()}
              {/* Pack Animal Encumbrance */}
              {comp.isPackAnimal && (() => {
                const horseEnc = character.trappings.filter(t => t.storedOnHorse).reduce((s, t) => s + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);
                return (
                  <div style={{ marginBottom: '8px', padding: '6px 10px', background: 'rgba(200,168,76,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 600 }}>🐴 Carrying Encumbrance</span>
                    <span style={{ fontSize: '14px', color: 'var(--accent-gold)', fontWeight: 700 }}>{horseEnc}</span>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {TRAINED_SKILLS.map((skill) => {
                  const has = (comp.trained || []).includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => {
                      const next = has ? (comp.trained || []).filter((s: string) => s !== skill) : [...(comp.trained || []), skill];
                      uc('trained', next);
                    }} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: has ? 'rgba(90,154,90,0.2)' : 'transparent', border: `1px solid ${has ? 'var(--success)' : 'var(--border)'}`, color: has ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {skill}
                    </button>
                  );
                })}
              </div>
              <EditableField label="Traits" value={comp.traits} onSave={(v) => uc('traits', v)} />
              <EditableField label="Notes" value={comp.notes} onSave={(v) => uc('notes', v)} />
            </div>
          );
        })}
      </Card>

      {/* Psychology */}
      <Card>
        <SectionHeader icon={Brain} title="Psychology" />
        <textarea value={character.psych} onChange={(e) => update('psych', e.target.value)} placeholder="Phobias, animosities..." style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px', fontSize: '13px', minHeight: '60px', resize: 'vertical' }} />
      </Card>

      {/* Corruption & Mutation */}
      <CorruptionCard character={character} update={update} updateCharacter={updateCharacter} />

      {/* Ambitions & Party */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
        <Picker items={ADV_SKILL_DB} getLabel={(s) => `${s.n} (${s.c})`} onSelect={addAdvancedSkillFromPicker} onClose={() => setShowAdvSkillPicker(false)} title="Select Advanced Skill" />
      )}
      {showTalentPicker && (
        <Picker items={TALENT_DB} getLabel={(t) => t.name} onSelect={addTalentFromPicker} onClose={() => setShowTalentPicker(false)} title="Select Talent" />
      )}
      {showSpellPicker && (
        <Picker items={SPELL_LIST} getLabel={(s) => `${s.name} (CN ${s.cn})`} onSelect={addSpellFromPicker} onClose={() => setShowSpellPicker(false)} title="Select Spell" />
      )}
      {showTrappingPicker && (
        <Picker items={TRAPPING_LIST} getLabel={(t) => `${t.name} (Enc ${t.enc})`} onSelect={(t) => { updateCharacter((c) => ({ ...c, trappings: [...c.trappings, { name: t.name, enc: t.enc, quantity: 1 }] })); setShowTrappingPicker(false); }} onClose={() => setShowTrappingPicker(false)} title="Select Trapping" />
      )}
      {showAnimalPicker && (
        <Picker items={ANIMAL_TEMPLATES} getLabel={(a) => `${a.name} (${a.species})`} onSelect={(a) => { updateCharacter((c) => ({ ...c, companions: [...c.companions, { name: '', species: a.species, M: a.M, WS: a.WS, BS: a.BS, S: a.S, T: a.T, I: a.I, Ag: a.Ag, Dex: a.Dex, Int: a.Int, WP: a.WP, Fel: a.Fel, W: a.W, wCur: a.W, traits: a.traits, trained: [...a.trained], notes: a.notes }] })); setShowAnimalPicker(false); }} onClose={() => setShowAnimalPicker(false)} title="Select Animal Template" />
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

      {/* Roll History */}
      <RollHistoryPanel history={rollHistory} onClear={clearHistory ?? (() => {})} />

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
              <div key={idx} style={{ marginBottom: idx < content!.sections.length - 1 ? '6px' : 0 }}>
                <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{s.label}</div>
                <div>{s.text}</div>
              </div>
            ))}
          </Tooltip>
        );
      })()}
    </div>
  );
}
