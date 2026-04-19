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
import styles from './CharacterPage.module.css';

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

type CharSubTab = 'identity' | 'abilities' | 'gear' | 'notes';

export function CharacterPage({ character, update, updateCharacter, rollHistory = [], addRoll, clearHistory }: CharacterPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<CharSubTab>('identity');
  const [hideUntrainedSkills, setHideUntrainedSkills] = useState(() => {
    try { return localStorage.getItem('wfrp-hideUntrainedSkills') === 'true'; } catch { return false; }
  });

  // Persist the filter preference to localStorage
  const toggleHideUntrained = () => {
    const next = !hideUntrainedSkills;
    setHideUntrainedSkills(next);
    try { localStorage.setItem('wfrp-hideUntrainedSkills', String(next)); } catch { /* ignore */ }
  };
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
    <div className={styles.sectionGap}>
      {/* Sub-tab navigation */}
      <div className={styles.subTabBar}>
        <button type="button" className={activeSubTab === 'identity' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('identity')}>Identity</button>
        <button type="button" className={activeSubTab === 'abilities' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('abilities')}>Abilities</button>
        <button type="button" className={activeSubTab === 'gear' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('gear')}>Gear &amp; Wealth</button>
        <button type="button" className={activeSubTab === 'notes' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('notes')}>Notes</button>
      </div>

      {/* ═══ IDENTITY TAB ═══ */}
      {activeSubTab === 'identity' && (<>
      {/* Portrait + Personal Details row */}
      <div className={styles.identityRow}>
        <CharacterPortrait
          portrait={character.portrait || ''}
          characterName={character.name}
          onUpload={(dataUrl) => update('portrait', dataUrl)}
          onRemove={() => update('portrait', '')}
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
        <div className={styles.overflowAuto}>
          <table className={styles.tableBase}>
            <thead>
              <tr>
                <th className={styles.thCenter} title="Characteristic">Char</th>
                <th className={styles.thCenter}>Initial</th>
                <th className={styles.thCenter} title="Advances">Advance</th>
                <th className={styles.thCenter}>Current</th>
                <th className={styles.thCenter} title="Talent Bonus">Bonus</th>
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
                    <td className={c.b > 0 ? styles.charBonusActive : styles.charBonusInactive}>{c.b || '—'}</td>
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
      </>)}

      {/* ═══ ABILITIES TAB ═══ */}
      {activeSubTab === 'abilities' && (<>
      {/* Basic Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title="Basic Skills" action={
          <button type="button" onClick={toggleHideUntrained} className={hideUntrainedSkills ? styles.hideUntrainedBtnActive : styles.hideUntrainedBtn}>
            {hideUntrainedSkills ? 'Show All' : 'Trained Only'}
          </button>
        } />
        <table className={styles.tableBase}>
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
            {character.bSkills.map((skill, i) => {
              if (hideUntrainedSkills && skill.a === 0) return null;
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
              return (
                <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
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
        <SectionHeader icon={BookOpen} title="Advanced Skills" action={
          <div className={styles.actionRow}>
            <AddButton label="Add from Rulebook" onClick={() => setShowAdvSkillPicker(true)} />
            <AddButton label="Add Custom" onClick={addCustomAdvancedSkill} />
          </div>
        } />
        <table className={styles.tableBase}>
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
            {character.aSkills.map((skill, i) => {
              const charVal = character.chars[skill.c as CharacteristicKey];
              const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
              return (
                <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
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
          <div className={styles.actionRow}>
            <AddButton label="Add from Rulebook" onClick={() => setShowTalentPicker(true)} />
            <AddButton label="Add Custom" onClick={addCustomTalent} />
          </div>
        } />
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
      </Card>

      {/* Spells — only show if character has magic talents/skills or already has spells */}
      {(character.spells.length > 0 || character.talents.some(t =>
        t.n.includes('Magic') || t.n.includes('Pray') || t.n.includes('Invoke')
      ) || character.aSkills.some(s =>
        s.n.startsWith('Channelling') || s.n.startsWith('Language (Magick)')
      )) && (
      <Card>
        <SectionHeader icon={Wand2} title="Spells & Prayers" action={
          <div className={styles.actionRow}>
            <AddButton label="Add from Rulebook" onClick={() => setShowSpellPicker(true)} />
            <AddButton label="Add Custom" onClick={addCustomSpell} />
          </div>
        } />
        <table className={styles.tableBase}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>CN</th>
              <th className={styles.th}>Range</th>
              <th className={styles.th}>Duration</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {character.spells.map((s, i) => (
              <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
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
          <div className={styles.runesEmpty}>
            No runes learned yet. Learn runes on the Advancement page.
          </div>
        ) : (
          <div className={styles.runesGrid}>
            {(character.knownRunes ?? []).map((runeId) => {
              const rune = getRuneById(runeId);
              if (!rune) return null;
              return (
                <div key={runeId} className={styles.runeBadge}>
                  <span className={styles.runeName}>{rune.name}</span>
                  {rune.isMaster && <span className={styles.runeMaster}>★</span>}
                  <div className={styles.runeCategory}>{rune.category}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.runeCount}>
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
          <div className={styles.actionRow}>
            <AddButton label="Add from Rulebook" onClick={() => setShowTrappingPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, trappings: [...c.trappings, { name: '', enc: '0', quantity: 1 }] }))} />
          </div>
        } />
        <table className={styles.tableBase}>
          <thead><tr><th className={styles.th}>Name</th><th className={styles.th} title="Encumbrance value — total Enc is shown in the Wealth & Encumbrance section">Enc</th><th className={styles.th}>Qty</th><th className={styles.thCenter} title="Stored on horse companion — excluded from character encumbrance">🐴</th><th className={styles.th}></th></tr></thead>
          <tbody>
            {character.trappings.map((t, i) => (
              <tr key={i} className={t.storedOnHorse ? styles.rowHorse : i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.td}><EditableField label="" value={t.name} onSave={(v) => update(`trappings.${i}.name`, v)} /></td>
                <td className={styles.td}><EditableField label="" value={t.enc} onSave={(v) => update(`trappings.${i}.enc`, v)} style={{ minWidth: '40px' }} /></td>
                <td className={styles.td}><EditableField label="" value={t.quantity} type="number" onSave={(v) => update(`trappings.${i}.quantity`, v)} style={{ minWidth: '40px' }} /></td>
                <td className={styles.tdCenter}>
                  <input type="checkbox" checked={!!t.storedOnHorse} onChange={(e) => update(`trappings.${i}.storedOnHorse`, e.target.checked)} title="Stored on horse" className={styles.checkboxCell} />
                </td>
                <td className={styles.td}><button type="button" onClick={() => setDeleteTarget({ type: 'trapping', index: i })} className={styles.deleteBtn}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Wealth & Encumbrance */}
      <Card>
        <div className={styles.wealthEncGrid}>
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
      {/* Animal Companions */}
      <Card>
        <SectionHeader icon={PawPrint} title="Animal Companions" action={
          <div className={styles.actionRow}>
            <AddButton label="Add from Templates" onClick={() => setShowAnimalPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, companions: [...c.companions, { name: '', species: '', M: 0, WS: 0, BS: 0, S: 0, T: 0, I: 0, Ag: 0, Dex: 0, Int: 0, WP: 0, Fel: 0, W: 1, wCur: 1, traits: '', trained: [], notes: '' }] }))} />
          </div>
        } />
        {character.companions.map((comp, ci) => {
          const uc = (field: string, val: unknown) => update(`companions.${ci}.${field}`, val);
          const charKeys = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'] as const;
          return (
            <div key={ci} className={comp.isPackAnimal ? styles.companionCardPack : styles.companionCard}>
              <div className={styles.companionHeader}>
                <div className={styles.companionHeaderLeft}>
                  <EditableField label="Name" value={comp.name} onSave={(v) => uc('name', v)} />
                  <EditableField label="Species" value={comp.species} onSave={(v) => uc('species', v)} />
                  <label className={comp.isPackAnimal ? styles.packAnimalLabelActive : styles.packAnimalLabelInactive} title="Designate as pack animal — trappings marked 'stored on horse' will count toward this companion's encumbrance">
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
                    }} className={styles.checkboxCell} />
                    🐴 Pack Animal
                  </label>
                </div>
                <button type="button" onClick={() => setDeleteTarget({ type: 'companion', index: ci })} className={styles.deleteBtn}>✕</button>
              </div>
              <div className={styles.companionStats}>
                {charKeys.map((k) => (
                  <div key={k} className={styles.companionStatCell}>
                    <div className={styles.companionStatLabel}>{k}</div>
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
                const wCountClass = pct > 50 ? styles.woundCountHigh : pct > 20 ? styles.woundCountMedium : styles.woundCountLow;
                return (
                  <div className={styles.companionWoundBar}>
                    <div className={styles.companionWoundRow}>
                      <span className={styles.companionWoundLabel}>Wounds</span>
                      <button type="button" onClick={() => uc('wCur', Math.max(0, curW - 1))} className={styles.woundMinusBtn}>−</button>
                      <div className={styles.woundProgressContainer}>
                        <div className={styles.woundProgressTrack}>
                          <div className={styles.woundProgressFill} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: wColor }} />
                        </div>
                      </div>
                      <span className={wCountClass}>{curW}/{maxW}</span>
                      <button type="button" onClick={() => uc('wCur', Math.min(maxW, curW + 1))} className={styles.woundPlusBtn}>+</button>
                      <button type="button" onClick={() => uc('wCur', maxW)} className={styles.woundFullBtn}>Full</button>
                    </div>
                  </div>
                );
              })()}
              {/* Pack Animal Encumbrance */}
              {comp.isPackAnimal && (() => {
                const horseEnc = character.trappings.filter(t => t.storedOnHorse).reduce((s, t) => s + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);
                return (
                  <div className={styles.packEncBar}>
                    <span className={styles.packEncLabel}>🐴 Carrying Encumbrance</span>
                    <span className={styles.packEncValue}>{horseEnc}</span>
                  </div>
                );
              })()}
              <div className={styles.trainedSkillsRow}>
                {TRAINED_SKILLS.map((skill) => {
                  const has = (comp.trained || []).includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => {
                      const next = has ? (comp.trained || []).filter((s: string) => s !== skill) : [...(comp.trained || []), skill];
                      uc('trained', next);
                    }} className={has ? styles.trainedSkillBtnActive : styles.trainedSkillBtn}>
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
        <textarea value={character.psych} onChange={(e) => update('psych', e.target.value)} placeholder="Phobias, animosities..." className={styles.textarea} />
      </Card>

      {/* Corruption & Mutation */}
      <CorruptionCard character={character} update={update} updateCharacter={updateCharacter} />

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
              <div key={idx} className={idx < content!.sections.length - 1 ? styles.tooltipSection : styles.tooltipSectionLast}>
                <div className={styles.tooltipSectionLabel}>{s.label}</div>
                <div>{s.text}</div>
              </div>
            ))}
          </Tooltip>
        );
      })()}
    </div>
  );
}
