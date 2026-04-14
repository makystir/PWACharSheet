import { useState } from 'react';
import type { Character, CharacteristicKey, ArmourPoints } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Picker } from '../shared/Picker';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { FortuneResolvePanel } from '../shared/FortuneResolvePanel';
import { SpellCastingPanel } from '../shared/SpellCastingPanel';
import { RuneManager } from '../shared/RuneManager';
import { WEAPONS } from '../../data/weapons';
import { ARMOURS } from '../../data/armour';
import { CONDITIONS } from '../../data/conditions';
import { applyCondition, removeCondition, incrementAdvantage, decrementAdvantage } from '../../logic/combat';
import { recordCriticalWound, healCriticalWound } from '../../logic/critical-wounds';
import { getBonus } from '../../logic/calculators';
import { getRuneDamageBonus, getRuneQualities, aggregateAllRuneEffects } from '../../logic/runes';
import { computeSkillTarget, type RollResult, type DifficultyLevel } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import { Sword, Shield, AlertTriangle, Zap, Activity, Heart, Crosshair, Target, Info } from 'lucide-react';
import { Tooltip } from '../shared/Tooltip';
import { resolveConditionTooltip } from '../../logic/tooltip-content';

interface CombatPageProps {
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

const smallBtn: React.CSSProperties = { padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const sectionGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px' };
const diceBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1, opacity: 0.7 };

export const RANGED_GROUPS = ['Bow', 'Blackpowder', 'Crossbow', 'Sling', 'Throwing', 'Entangling', 'Explosives'];

// Weapon-to-skill matching (exported for testing)
export function findSkillForWeapon(
  weapon: { group: string },
  bSkills: { n: string; c: string; a: number }[],
  aSkills: { n: string; c: string; a: number }[],
) {
  const isRanged = RANGED_GROUPS.includes(weapon.group);
  const allSkills = [...bSkills, ...aSkills];

  if (isRanged) {
    const skillName = `Ranged (${weapon.group})`;
    return allSkills.find(s => s.n === skillName) || null;
  } else {
    // Melee: try exact group match first, fall back to Melee (Basic)
    const skillName = `Melee (${weapon.group})`;
    const exact = allSkills.find(s => s.n === skillName);
    if (exact) return exact;
    return allSkills.find(s => s.n === 'Melee (Basic)') || null;
  }
}

export function CombatPage({ character, update, updateCharacter, totalWounds, armourPoints, addRoll }: CombatPageProps) {
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showArmourPicker, setShowArmourPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; index: number } | null>(null);
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number; defaultDifficulty?: DifficultyLevel } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);
  const [conditionTooltip, setConditionTooltip] = useState<{ name: string; anchorEl: HTMLElement } | null>(null);
  const [runeManagerTarget, setRuneManagerTarget] = useState<{ type: 'weapon' | 'armour'; index: number } | null>(null);

  const SB = getBonus(character.chars.S.i + character.chars.S.a + character.chars.S.b);
  const halfSB = Math.floor(SB / 2);

  // Talent levels for weapon damage bonuses
  const getTalentLevel = (name: string) => {
    const t = character.talents.find(t => t.n && t.n.toLowerCase().startsWith(name.toLowerCase()));
    return t ? t.lvl : 0;
  };
  const accurateShot = getTalentLevel('Accurate Shot');
  const sureShot = getTalentLevel('Sure Shot');
  const strikeMighty = getTalentLevel('Strike Mighty Blow');
  const dirtyFighting = getTalentLevel('Dirty Fighting');

  const openWeaponRoll = (weapon: typeof character.weapons[number]) => {
    const skill = findSkillForWeapon(weapon, character.bSkills, character.aSkills);
    const isRanged = RANGED_GROUPS.includes(weapon.group);

    let baseTarget = 0;
    let skillName = isRanged ? `Ranged (${weapon.group})` : `Melee (${weapon.group})`;

    if (skill) {
      skillName = skill.n;
      const charVal = character.chars[skill.c as CharacteristicKey];
      if (charVal) {
        baseTarget = computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a);
      } else {
        baseTarget = skill.a;
      }
    }

    // Default to Hard when engaged + ranged + not Blackpowder (pistol proxy)
    let defaultDifficulty: DifficultyLevel | undefined;
    if (character.combatState.engaged && isRanged && weapon.group !== 'Blackpowder') {
      defaultDifficulty = 'Hard';
    }

    setRollDialogState({ name: skillName, baseTarget, defaultDifficulty });
  };

  const handleRollResult = (result: RollResult) => {
    setRollDialogState(null);
    setRollResultState(result);
    addRoll?.(result);
  };

  // Calculate effective damage for a weapon including SB and talent bonuses
  const calcWeaponDamage = (w: typeof character.weapons[number]) => {
    if (!w.damage || w.damage === '—') return { num: null, breakdown: '' };
    const ranged = RANGED_GROUPS.includes(w.group);
    let num = 0;
    const parts: string[] = [];

    if (w.damage.includes('1/2SB')) {
      num = halfSB;
      parts.push(`½SB(${halfSB})`);
      const m = w.damage.match(/1\/2SB\+(\d+)/);
      if (m) { num += parseInt(m[1]); parts.push(`+${m[1]}`); }
    } else if (w.damage.includes('SB')) {
      num = SB;
      parts.push(`SB(${SB})`);
      const m = w.damage.match(/SB\+(\d+)/);
      if (m) { num += parseInt(m[1]); parts.push(`+${m[1]}`); }
    } else {
      const m = w.damage.match(/\+?(\d+)/);
      if (m) { num = parseInt(m[1]); parts.push(`+${m[1]}`); }
    }

    if (ranged && accurateShot > 0) { num += accurateShot; parts.push(`AS+${accurateShot}`); }
    if (ranged && sureShot > 0) { num += sureShot; parts.push(`SS+${sureShot}`); }
    if (!ranged && strikeMighty > 0) { num += strikeMighty; parts.push(`SM+${strikeMighty}`); }
    if (w.group === 'Brawling' && dirtyFighting > 0) { num += dirtyFighting; parts.push(`DF+${dirtyFighting}`); }

    const runeBonus = getRuneDamageBonus(w.runes ?? []);
    if (runeBonus > 0) { num += runeBonus; parts.push(`Rune+${runeBonus}`); }

    return { num, breakdown: parts.join(' ') };
  };
  const woundPct = totalWounds > 0 ? (character.wCur / totalWounds) * 100 : 0;
  const woundColor = woundPct > 50 ? 'var(--success)' : woundPct > 20 ? 'var(--accent-gold)' : 'var(--danger)';

  return (
    <div style={sectionGap}>
      {/* === TOP ROW: Combat State + Wounds + Advantage === */}
      <div style={{ display: 'grid', gridTemplateColumns: character.combatState.inCombat ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
        {/* Combat State */}
        <Card>
          <SectionHeader icon={Crosshair} title="Combat State" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button type="button" onClick={() => {
              const newState = !character.combatState.inCombat;
              update('combatState.inCombat', newState);
              if (!newState) { update('combatState.currentRound', 0); update('advantage', 0); }
            }} style={{ ...smallBtn, padding: '10px', textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', background: character.combatState.inCombat ? 'rgba(200,80,80,0.3)' : 'rgba(90,154,90,0.2)', border: character.combatState.inCombat ? '1px solid var(--danger)' : '1px solid var(--success)', color: character.combatState.inCombat ? 'var(--danger)' : 'var(--success)' }}>
              {character.combatState.inCombat ? 'END COMBAT' : 'START COMBAT'}
            </button>
            <button type="button" onClick={() => update('combatState.engaged', !character.combatState.engaged)} style={{ ...smallBtn, padding: '8px', textAlign: 'center', background: character.combatState.engaged ? 'rgba(200,80,80,0.2)' : 'transparent', border: character.combatState.engaged ? '1px solid var(--danger)' : '1px solid var(--border)', color: character.combatState.engaged ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {character.combatState.engaged ? '⚔ Engaged' : 'Not Engaged'}
            </button>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', width: '50px' }}>Init</span>
              <input type="number" value={character.combatState.initiative || ''} onChange={(e) => update('combatState.initiative', Number(e.target.value) || 0)} style={{ flex: 1, padding: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-gold)', fontSize: '14px', fontWeight: 700, textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', width: '50px' }}>Round</span>
              <button type="button" onClick={() => update('combatState.currentRound', Math.max(0, character.combatState.currentRound - 1))} style={{ ...smallBtn, padding: '4px 10px', fontSize: '16px' }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'var(--font-heading)' }}>{character.combatState.currentRound}</span>
              <button type="button" onClick={() => update('combatState.currentRound', character.combatState.currentRound + 1)} style={{ ...smallBtn, padding: '4px 10px', fontSize: '16px' }}>+</button>
            </div>
          </div>
        </Card>

        {/* Wounds */}
        <Card>
          <SectionHeader icon={Heart} title="Wounds" />
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, color: woundColor, fontFamily: 'var(--font-heading)' }}>{character.wCur}</span>
            <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}> / {totalWounds}</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '4px', height: '10px', marginBottom: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, woundPct))}%`, background: woundColor, borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button type="button" onClick={() => update('wCur', Math.max(0, character.wCur - 1))} style={{ ...smallBtn, padding: '8px 16px', fontSize: '18px', fontWeight: 700, background: 'rgba(200,80,80,0.2)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>−</button>
            <button type="button" onClick={() => update('wCur', Math.min(totalWounds, character.wCur + 1))} style={{ ...smallBtn, padding: '8px 16px', fontSize: '18px', fontWeight: 700, background: 'rgba(90,154,90,0.2)', border: '1px solid var(--success)', color: 'var(--success)' }}>+</button>
            <button type="button" onClick={() => update('wCur', totalWounds)} style={{ ...smallBtn, padding: '8px 12px', fontSize: '11px', fontFamily: 'var(--font-heading)' }}>Full</button>
          </div>
          {character.wCur <= 0 && <div style={{ textAlign: 'center', marginTop: '6px', color: 'var(--danger)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>⚠ Down!</div>}
        </Card>

        {/* Advantage — only during combat */}
        {character.combatState.inCombat && (
        <Card>
          <SectionHeader icon={Zap} title="Advantage" />
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px', fontWeight: 900, color: 'var(--accent-gold)', fontFamily: 'var(--font-heading)' }}>{character.advantage}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button type="button" onClick={() => update('advantage', decrementAdvantage(character.advantage))} style={{ ...smallBtn, padding: '8px 20px', fontSize: '18px', fontWeight: 700 }}>−</button>
            <button type="button" onClick={() => update('advantage', incrementAdvantage(character.advantage))} style={{ ...smallBtn, padding: '8px 20px', fontSize: '18px', fontWeight: 700 }}>+</button>
            <button type="button" onClick={() => update('advantage', 0)} style={{ ...smallBtn, padding: '8px 12px', fontSize: '11px' }}>Reset</button>
          </div>
          {character.combatState.engaged && (
            <div style={{ marginTop: '8px', padding: '6px 8px', background: 'rgba(200,168,76,0.1)', border: '1px solid var(--accent-gold)', borderRadius: '4px', fontSize: '10px', color: 'var(--accent-gold)' }}>
              ⚠ Ranged weapons at melee distance: -20 to hit (non-pistol), Cool test required
            </div>
          )}
        </Card>
        )}
      </div>

      {/* === Fortune / Resolve Panel === */}
      <FortuneResolvePanel character={character} update={update} updateCharacter={updateCharacter} />

      {/* === Spell Casting Panel — only show if character has spells/prayers === */}
      {(character.spells.length > 0 || character.talents.some(t =>
        t.n.includes('Magic') || t.n.includes('Pray') || t.n.includes('Invoke')
      ) || character.aSkills.some(s =>
        s.n.startsWith('Channelling') || s.n.startsWith('Language (Magick)')
      )) && (
        <SpellCastingPanel character={character} update={update} updateCharacter={updateCharacter} addRoll={addRoll} />
      )}

      {/* === Conditions — only during combat === */}
      {character.combatState.inCombat && (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        {/* Conditions */}
        <Card>
          <SectionHeader icon={AlertTriangle} title="Conditions" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CONDITIONS.map((cond) => {
              const active = character.conditions.find((c) => c.name === cond.name);
              return (
                <div key={cond.name} style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer', background: active ? 'rgba(200,80,80,0.3)' : 'var(--bg-tertiary)', color: active ? '#fff' : 'var(--text-secondary)', border: `1px solid ${active ? 'var(--danger)' : 'var(--border)'}` }}>
                  <button
                    type="button"
                    aria-label={`Info for ${cond.name}`}
                    aria-describedby={conditionTooltip?.name === cond.name ? `tooltip-condition-${cond.name}` : undefined}
                    onClick={(e) => {
                      if (conditionTooltip?.name === cond.name) {
                        setConditionTooltip(null);
                        return;
                      }
                      const content = resolveConditionTooltip(cond.name);
                      if (content) {
                        setConditionTooltip({ name: cond.name, anchorEl: e.currentTarget });
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '11px', display: 'flex', alignItems: 'center' }}
                  >
                    <Info size={12} />
                  </button>
                  <button type="button" onClick={() => updateCharacter((c) => ({ ...c, conditions: applyCondition(c.conditions, cond.name) }))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '12px' }}>
                    {cond.name}{active && active.level > 1 ? ` (${active.level})` : ''}
                  </button>
                  {active && <button type="button" onClick={() => updateCharacter((c) => ({ ...c, conditions: removeCondition(c.conditions, cond.name) }))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '11px', marginLeft: '2px' }}>✕</button>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* AP Summary */}
        <Card>
          <SectionHeader icon={Shield} title="Armour Points" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px' }}>
            {(['head', 'body', 'lArm', 'rArm', 'lLeg', 'rLeg'] as const).map((loc) => (
              <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{loc === 'lArm' ? 'L Arm' : loc === 'rArm' ? 'R Arm' : loc === 'lLeg' ? 'L Leg' : loc === 'rLeg' ? 'R Leg' : loc}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{armourPoints[loc]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}

      {/* === Critical Wounds — only during combat === */}
      {character.combatState.inCombat && (
      <Card>
        <SectionHeader icon={Activity} title="Critical Wounds" action={
          <AddButton label="Add" onClick={() => updateCharacter((c) => ({ ...c, criticalWounds: recordCriticalWound(c.criticalWounds, { location: 'Body', description: 'New wound', effects: '', duration: '', severity: 1, healed: false }) }))} />
        } />
        {character.criticalWounds.filter((w) => !w.healed).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>No active critical wounds</div>}
        {character.criticalWounds.filter((w) => !w.healed).map((w) => (
          <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: 'var(--parchment)', fontWeight: 600 }}>{w.location}</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '13px' }}>{w.description}</span>
            </div>
            <button type="button" onClick={() => updateCharacter((c) => ({ ...c, criticalWounds: healCriticalWound(c.criticalWounds, w.id) }))} style={{ ...smallBtn, color: 'var(--success)' }}>Heal</button>
          </div>
        ))}
      </Card>
      )}

      {/* === Weapons === */}
      <Card>
        <SectionHeader icon={Sword} title="Weapons" action={
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Rulebook" onClick={() => setShowWeaponPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, weapons: [...c.weapons, { name: '', group: '', enc: '0', damage: '', qualities: '' }] }))} />
          </div>
        } />
        <table style={tableStyle}>
          <thead><tr>
            <th style={thStyle}>Name</th><th style={thStyle}>Group</th><th style={thStyle}>Dmg</th><th style={{ ...thStyle, color: 'var(--accent-gold)' }}>Total</th><th style={thStyle}>Range/Reach</th><th style={thStyle}>Qualities</th><th style={thStyle}>Runes</th><th style={thStyle}></th><th style={thStyle}></th>
          </tr></thead>
          <tbody>
            {character.weapons.map((w, i) => {
              const calc = calcWeaponDamage(w);
              return (
              <tr key={i}>
                <td style={tdStyle}><EditableField label="" value={w.name} onSave={(v) => update(`weapons.${i}.name`, v)} /></td>
                <td style={tdStyle}><EditableField label="" value={w.group} onSave={(v) => update(`weapons.${i}.group`, v)} /></td>
                <td style={tdStyle}><EditableField label="" value={w.damage} onSave={(v) => update(`weapons.${i}.damage`, v)} /></td>
                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--accent-gold)', textAlign: 'center' }}>{calc.num !== null ? calc.num : '—'}</td>
                <td style={tdStyle}><EditableField label="" value={w.rangeReach || w.maxR || ''} onSave={(v) => update(`weapons.${i}.rangeReach`, v)} /></td>
                <td style={tdStyle}>
                  <EditableField label="" value={w.qualities} onSave={(v) => update(`weapons.${i}.qualities`, v)} />
                  {getRuneQualities(w.runes ?? []).length > 0 && (
                    <span style={{ color: 'var(--accent-gold)', fontSize: '11px', marginLeft: '4px' }}>
                      +{getRuneQualities(w.runes ?? []).join(', ')}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button type="button" onClick={() => setRuneManagerTarget({ type: 'weapon', index: i })}
                    style={{ background: 'none', border: 'none', color: (w.runes?.length ?? 0) > 0 ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                    ⚒ {(w.runes?.length ?? 0)}/3
                  </button>
                </td>
                <td style={tdStyle}><button type="button" onClick={() => setDeleteTarget({ type: 'weapon', index: i })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button></td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button type="button" style={diceBtn} onClick={() => openWeaponRoll(w)} title={`Roll ${w.name}`} aria-label={`Roll ${w.name}`}>🎲</button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
          Total = base damage + SB (or ½SB for ranged) + talent bonuses (Strike Mighty Blow, Accurate Shot, Sure Shot, Dirty Fighting). Final damage = Total + attack SL.
        </div>
      </Card>

      {/* === Armour === */}
      <Card>
        <SectionHeader icon={Shield} title="Armour" action={
          <div style={{ display: 'flex', gap: '4px' }}>
            <AddButton label="Add from Rulebook" onClick={() => setShowArmourPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, armour: [...c.armour, { name: '', locations: '', enc: '0', ap: 0, qualities: '' }] }))} />
          </div>
        } />
        <table style={tableStyle}>
          <thead><tr>
            <th style={thStyle}>Name</th><th style={thStyle}>Locations</th><th style={thStyle}>AP</th><th style={thStyle}>Qualities</th><th style={thStyle}>Runes</th><th style={{ ...thStyle, textAlign: 'center' }} title="Worn items have encumbrance reduced by 1">Worn</th><th style={thStyle}></th>
          </tr></thead>
          <tbody>
            {character.armour.map((a, i) => (
              <tr key={i}>
                <td style={tdStyle}><EditableField label="" value={a.name} onSave={(v) => update(`armour.${i}.name`, v)} /></td>
                <td style={tdStyle}><EditableField label="" value={a.locations} onSave={(v) => update(`armour.${i}.locations`, v)} /></td>
                <td style={tdStyle}><EditableField label="" value={a.ap} type="number" onSave={(v) => update(`armour.${i}.ap`, v)} /></td>
                <td style={tdStyle}><EditableField label="" value={a.qualities} onSave={(v) => update(`armour.${i}.qualities`, v)} /></td>
                <td style={tdStyle}>
                  <button type="button" onClick={() => setRuneManagerTarget({ type: 'armour', index: i })}
                    style={{ background: 'none', border: 'none', color: (a.runes?.length ?? 0) > 0 ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                    ⚒ {(a.runes?.length ?? 0)}/3
                  </button>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <input type="checkbox" checked={a.worn !== false} onChange={(e) => update(`armour.${i}.worn`, e.target.checked)} title={`Enc: ${Math.max(0, (parseFloat(a.enc) || 0) - (a.worn !== false ? 1 : 0))} (base ${a.enc}${a.worn !== false ? ', -1 worn' : ''})`} style={{ cursor: 'pointer' }} />
                </td>
                <td style={tdStyle}><button type="button" onClick={() => setDeleteTarget({ type: 'armour', index: i })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* === Rune Effect Summary === */}
      {(() => {
        const effects = aggregateAllRuneEffects(character.weapons, character.armour);
        const hasEffects = effects.damageByWeapon.length > 0 || effects.apByArmour.length > 0 ||
          Object.keys(effects.characteristics).length > 0 || effects.qualities.length > 0 || effects.special.length > 0;
        if (!hasEffects) return null;
        return (
          <Card>
            <SectionHeader icon={Sword} title="Rune Effects" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              {effects.damageByWeapon.map((d, i) => (
                <div key={`dmg-${i}`} style={{ color: 'var(--text-secondary)' }}>{d.weaponName}: <span style={{ color: 'var(--accent-gold)' }}>+{d.bonus} Damage</span></div>
              ))}
              {effects.apByArmour.map((a, i) => (
                <div key={`ap-${i}`} style={{ color: 'var(--text-secondary)' }}>{a.armourName}: <span style={{ color: 'var(--accent-gold)' }}>+{a.bonus} AP</span></div>
              ))}
              {Object.entries(effects.characteristics).map(([key, val]) => (
                <div key={key} style={{ color: 'var(--text-secondary)' }}>{key}: <span style={{ color: 'var(--accent-gold)' }}>+{val}</span></div>
              ))}
              {effects.qualities.map((q, i) => (
                <div key={`q-${i}`} style={{ color: 'var(--text-secondary)' }}>{q.weaponName}: <span style={{ color: 'var(--accent-gold)' }}>{q.qualities.join(', ')}</span></div>
              ))}
              {effects.special.map((s, i) => (
                <div key={`s-${i}`} style={{ color: 'var(--text-secondary)' }}>{s.itemName}: <span style={{ color: 'var(--parchment)' }}>{s.description}</span></div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* === Ammo Tracker — only during combat === */}
      {character.combatState.inCombat && (
      <Card>
        <SectionHeader icon={Target} title="Ammunition" action={
          <AddButton label="Add" onClick={() => updateCharacter((c) => ({ ...c, ammo: [...c.ammo, { name: 'New Ammo', quantity: 12, max: 12, enc: '0', qualities: '' }] }))} />
        } />
        {character.ammo.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>No ammunition tracked</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {character.ammo.map((a, i) => {
            const maxAmmo = a.max || a.quantity;
            return (
            <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <EditableField label="" value={a.name} onSave={(v) => update(`ammo.${i}.name`, v)} />
                <button type="button" onClick={() => updateCharacter((c) => ({ ...c, ammo: c.ammo.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: 900, color: a.quantity <= 3 ? 'var(--danger)' : 'var(--accent-gold)', fontFamily: 'var(--font-heading)', minWidth: '30px', textAlign: 'center' }}>{a.quantity}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/</span>
                <input type="number" value={maxAmmo} onChange={(e) => update(`ammo.${i}.max`, Number(e.target.value) || 0)} style={{ width: '40px', padding: '2px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" onClick={() => { if (a.quantity > 0) update(`ammo.${i}.quantity`, a.quantity - 1); }} style={{ ...smallBtn, flex: 1, padding: '6px 0', textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', background: 'rgba(200,80,80,0.2)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>FIRE</button>
                <button type="button" onClick={() => { if (a.quantity < maxAmmo) update(`ammo.${i}.quantity`, Math.min(maxAmmo, a.quantity + 1)); }} style={{ ...smallBtn, flex: 1, padding: '6px 0', textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', background: 'rgba(90,154,90,0.2)', border: '1px solid var(--success)', color: 'var(--success)' }}>+1</button>
                <button type="button" onClick={() => update(`ammo.${i}.quantity`, maxAmmo)} style={{ ...smallBtn, flex: 1, padding: '6px 0', textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', background: 'rgba(90,120,180,0.2)', border: '1px solid #5a7aaa', color: '#a0c0e8' }}>REFILL</button>
              </div>
            </div>
            );
          })}
        </div>
      </Card>
      )}

      {/* RuneManager Modal */}
      {runeManagerTarget && (() => {
        const isWeapon = runeManagerTarget.type === 'weapon';
        const item = isWeapon ? character.weapons[runeManagerTarget.index] : character.armour[runeManagerTarget.index];
        if (!item) return null;
        return (
          <RuneManager
            itemType={runeManagerTarget.type}
            itemIndex={runeManagerTarget.index}
            itemName={item.name || 'Unnamed'}
            currentRunes={((item as { runes?: string[] }).runes) ?? []}
            knownRunes={character.knownRunes ?? []}
            onAddRune={(runeId) => {
              updateCharacter((c) => {
                if (isWeapon) {
                  const weapons = [...c.weapons];
                  const w = { ...weapons[runeManagerTarget.index] };
                  w.runes = [...(w.runes ?? []), runeId];
                  weapons[runeManagerTarget.index] = w;
                  return { ...c, weapons };
                } else {
                  const armour = [...c.armour];
                  const a = { ...armour[runeManagerTarget.index] };
                  a.runes = [...(a.runes ?? []), runeId];
                  armour[runeManagerTarget.index] = a;
                  return { ...c, armour };
                }
              });
            }}
            onRemoveRune={(runeIndex) => {
              updateCharacter((c) => {
                if (isWeapon) {
                  const weapons = [...c.weapons];
                  const w = { ...weapons[runeManagerTarget.index] };
                  w.runes = (w.runes ?? []).filter((_, i) => i !== runeIndex);
                  weapons[runeManagerTarget.index] = w;
                  return { ...c, weapons };
                } else {
                  const armour = [...c.armour];
                  const a = { ...armour[runeManagerTarget.index] };
                  a.runes = (a.runes ?? []).filter((_, i) => i !== runeIndex);
                  armour[runeManagerTarget.index] = a;
                  return { ...c, armour };
                }
              });
            }}
            onClose={() => setRuneManagerTarget(null)}
          />
        );
      })()}

      {/* Pickers */}
      {showWeaponPicker && <Picker items={WEAPONS} getLabel={(w) => `${w.name} (${w.group})`} onSelect={(w) => { updateCharacter((c) => ({ ...c, weapons: [...c.weapons, { ...w }] })); setShowWeaponPicker(false); }} onClose={() => setShowWeaponPicker(false)} title="Select Weapon" />}
      {showArmourPicker && <Picker items={ARMOURS} getLabel={(a) => `${a.name} (AP ${a.ap})`} onSelect={(a) => { updateCharacter((c) => ({ ...c, armour: [...c.armour, { ...a }] })); setShowArmourPicker(false); }} onClose={() => setShowArmourPicker(false)} title="Select Armour" />}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog message={`Remove this ${deleteTarget.type}?`} onConfirm={() => {
          if (deleteTarget.type === 'weapon') updateCharacter((c) => ({ ...c, weapons: c.weapons.filter((_, i) => i !== deleteTarget.index) }));
          else if (deleteTarget.type === 'armour') updateCharacter((c) => ({ ...c, armour: c.armour.filter((_, i) => i !== deleteTarget.index) }));
          setDeleteTarget(null);
        }} onCancel={() => setDeleteTarget(null)} confirmLabel="Remove" />
      )}

      {/* Roll Dialog */}
      {rollDialogState && (
        <RollDialog
          skillOrCharName={rollDialogState.name}
          baseTarget={rollDialogState.baseTarget}
          defaultDifficulty={rollDialogState.defaultDifficulty}
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

      {/* Condition Tooltip */}
      {conditionTooltip && (() => {
        const content = resolveConditionTooltip(conditionTooltip.name);
        if (!content) return null;
        return (
          <Tooltip
            anchorEl={conditionTooltip.anchorEl}
            title={content.title}
            onClose={() => setConditionTooltip(null)}
            id={`tooltip-condition-${conditionTooltip.name}`}
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
