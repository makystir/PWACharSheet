import { useState } from 'react';
import type { Character, ArmourPoints } from '../../types/character';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './CombatPage.module.css';
import { Picker } from '../shared/Picker';
import { Toast } from '../shared/Toast';
import { RollDialog } from '../shared/RollDialog';
import { useUndoToast } from '../../hooks/useUndoToast';
import { removeAtIndex, restoreAtIndex } from '../../logic/undo';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { FortuneResolvePanel } from '../shared/FortuneResolvePanel';
import { SpellCastingPanel } from '../shared/SpellCastingPanel';
import { RuneManager } from '../shared/RuneManager';
import { RollHistoryPanel } from '../shared/RollHistoryPanel';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { CombatDashboard } from '../combat/CombatDashboard';
import { AttackFlow } from '../combat/AttackFlow';
import { QuickRollBar } from '../combat/QuickRollBar';
import { TakeDamagePanel } from '../combat/TakeDamagePanel';
import { WeaponCards } from '../combat/WeaponCards';
import { ArmourMap } from '../combat/ArmourMap';
import { AmmoTracker } from '../combat/AmmoTracker';
import { CriticalWoundsPanel } from '../combat/CriticalWoundsPanel';
import { ConditionPicker } from '../combat/ConditionPicker';
import { HirelingCombatPanel } from '../retinue/HirelingCombatPanel';
import { WEAPONS } from '../../data/weapons';
import { ARMOURS } from '../../data/armour';
import { applyCondition, removeCondition, incrementAdvantage, decrementAdvantage } from '../../logic/combat';
import { recordCriticalWound, healCriticalWound } from '../../logic/critical-wounds';
import { getBonus } from '../../logic/calculators';
import { findSkillForWeapon, RANGED_GROUPS } from '../../logic/weapons';
import { computeSkillTarget, type RollResult, type DifficultyLevel } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import type { CharacteristicKey } from '../../types/character';
import type { HitLocation } from '../combat/hitLocationTable';

// Re-exports for backward compatibility
export { RANGED_GROUPS, findSkillForWeapon } from '../../logic/weapons';

interface CombatPageProps {
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
}



export function CombatPage({ character, characterId, update, updateCharacter, totalWounds, armourPoints, addRoll, rollHistory, clearHistory }: CombatPageProps) {
    const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showArmourPicker, setShowArmourPicker] = useState(false);
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number; defaultDifficulty?: DifficultyLevel } | null>(null);
  const undoToast = useUndoToast();
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);
  const [runeManagerTarget, setRuneManagerTarget] = useState<{ type: 'weapon' | 'armour'; index: number } | null>(null);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [downLocation, setDownLocation] = useState<HitLocation | undefined>(undefined);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const inCombat = character.combatState.inCombat;
  const TB = getBonus(character.chars.T.i + character.chars.T.a + character.chars.T.b);

  /* ── Weapon roll callback (used by WeaponCards) ── */
  const openWeaponRoll = (weapon: typeof character.weapons[number]) => {
    const skill = findSkillForWeapon(weapon, character.bSkills, character.aSkills);
    const isRanged = RANGED_GROUPS.includes(weapon.group);
    let skillName = isRanged ? `Ranged (${weapon.group})` : `Melee (${weapon.group})`;
    let baseTarget = 0;
    if (skill) {
      skillName = skill.n;
      const charVal = character.chars[skill.c as CharacteristicKey];
      if (charVal) baseTarget = computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a);
      else baseTarget = skill.a;
    }
    let defaultDifficulty: DifficultyLevel | undefined;
    if (character.combatState.engaged && isRanged && weapon.group !== 'Blackpowder') defaultDifficulty = 'Hard';
    setRollDialogState({ name: skillName, baseTarget, defaultDifficulty });
  };

  const handleRollResult = (result: RollResult) => { setRollDialogState(null); setRollResultState(result); addRoll?.(result); };

  /* ── START / END COMBAT ── */
  const startCombat = () => { update('combatState.inCombat', true); update('combatState.currentRound', 1); };
  const endCombat = () => { update('combatState.inCombat', false); update('combatState.currentRound', 0); update('advantage', 0); };

  /* ── Spell casting eligibility ── */
  const hasSpellcasting = character.spells.length > 0 ||
    character.talents.some(t => t.n.includes('Magic') || t.n.includes('Pray') || t.n.includes('Invoke')) ||
    character.aSkills.some(s => s.n.startsWith('Channelling') || s.n.startsWith('Language (Magick)'));

  return (
    <div className={styles.sectionGap}>
      {/* ── Dashboard ── */}
      <CombatDashboard
        wCur={character.wCur} totalWounds={totalWounds} advantage={character.advantage}
        combatState={character.combatState} conditions={character.conditions}
        fortune={character.fortune} fate={character.fate} resolve={character.resolve} resilience={character.resilience}
        inCombat={inCombat}
        useGroupAdvantage={character.houseRules?.useGroupAdvantage ?? false}
        character={character}
        updateCharacter={updateCharacter}
        onUpdateWounds={(d) => update('wCur', Math.max(0, Math.min(totalWounds, character.wCur + d)))}
        onUpdateAdvantage={(d) => update('advantage', d < 0 ? decrementAdvantage(character.advantage) : d === -character.advantage ? 0 : incrementAdvantage(character.advantage, character.houseRules.advantageCap))}
        onUpdateRound={(d) => update('combatState.currentRound', Math.max(0, character.combatState.currentRound + d))}
        onToggleEngaged={() => update('combatState.engaged', !character.combatState.engaged)}
        onRemoveCondition={(name) => updateCharacter((c) => ({ ...c, conditions: removeCondition(c.conditions, name) }))}
        onSpendFortune={() => updateCharacter((c) => ({ ...c, fortune: Math.max(0, c.fortune - 1) }))}
        onSpendResolve={() => updateCharacter((c) => ({ ...c, resolve: Math.max(0, c.resolve - 1) }))}
        onOpenConditionPicker={() => setShowConditionPicker(true)}
        onEndTurn={(result) => {
          updateCharacter((c) => {
            let newConditions = c.conditions;
            for (const name of result.removedConditions) {
              newConditions = removeCondition(newConditions, name);
            }
            return {
              ...c,
              wCur: result.newWounds,
              conditions: newConditions,
              combatState: { ...c.combatState, currentRound: result.roundAdvanced },
            };
          });
        }}
      />

      {/* ── Active Combat panels ── */}
      {inCombat && (
        <>
          <CollapsibleSection title="Attack Flow" storageKey={`combat-attack-${characterId}`} defaultExpanded={true}>
            <AttackFlow weapons={character.weapons} character={character} armourPoints={armourPoints} onRoll={(r) => addRoll?.(r)} />
          </CollapsibleSection>
          <CollapsibleSection title="Quick Roll" storageKey={`combat-quickroll-${characterId}`} defaultExpanded={true}>
            <QuickRollBar character={character} onRoll={(r) => addRoll?.(r)} />
          </CollapsibleSection>
          <CollapsibleSection title="Take Damage" storageKey={`combat-damage-${characterId}`} defaultExpanded={true}>
            <TakeDamagePanel toughnessBonus={TB} armourPoints={armourPoints} wCur={character.wCur} totalWounds={totalWounds}
              onApplyWounds={(w) => update('wCur', Math.max(0, character.wCur - w))} min1Wound={character.houseRules.min1Wound}
              onDown={(location) => setDownLocation(location)} />
          </CollapsibleSection>
        </>
      )}

      {/* ── Fortune / Resolve (readiness) ── */}
      <FortuneResolvePanel character={character} update={update} updateCharacter={updateCharacter} />

      {/* ── Spell Casting (conditional) ── */}
      {hasSpellcasting && <SpellCastingPanel character={character} update={update} updateCharacter={updateCharacter} addRoll={addRoll} />}

      {/* ── Weapons ── */}
      <CollapsibleSection title="Weapons" storageKey={`combat-weapons-${characterId}`} defaultExpanded={true}>
        <WeaponCards weapons={character.weapons} character={character} onRollWeapon={openWeaponRoll}
          onDeleteWeapon={(i) => {
            const weapon = character.weapons[i];
            updateCharacter((c) => ({ ...c, weapons: removeAtIndex(c.weapons, i) }));
            undoToast.show('Weapon removed', weapon, i, (item, index) => {
              updateCharacter((c) => ({ ...c, weapons: restoreAtIndex(c.weapons, item as typeof weapon, index) }));
            });
          }}
          onOpenRuneManager={(i) => setRuneManagerTarget({ type: 'weapon', index: i })}
          onOpenWeaponPicker={() => setShowWeaponPicker(true)}
          onAddCustomWeapon={() => updateCharacter((c) => ({ ...c, weapons: [...c.weapons, { name: '', group: '', enc: '0', damage: '', qualities: '' }] }))} />
      </CollapsibleSection>

      {/* ── Armour ── */}
      <CollapsibleSection title="Armour" storageKey={`combat-armour-${characterId}`} defaultExpanded={true}>
        <ArmourMap armourPoints={armourPoints} armourList={character.armour}
          weapons={character.weapons}
          onDeleteArmour={(i) => {
            const armourPiece = character.armour[i];
            updateCharacter((c) => ({ ...c, armour: removeAtIndex(c.armour, i) }));
            undoToast.show('Armour removed', armourPiece, i, (item, index) => {
              updateCharacter((c) => ({ ...c, armour: restoreAtIndex(c.armour, item as typeof armourPiece, index) }));
            });
          }}
          onUpdateArmour={(i, field, value) => {
            updateCharacter((c) => {
              const armour = [...c.armour];
              armour[i] = { ...armour[i], [field]: value };
              return { ...c, armour };
            });
          }}
          onOpenRuneManager={(i) => setRuneManagerTarget({ type: 'armour', index: i })}
          onOpenArmourPicker={() => setShowArmourPicker(true)}
          onAddCustomArmour={() => updateCharacter((c) => ({ ...c, armour: [...c.armour, { name: '', locations: '', enc: '0', ap: 0, qualities: '' }] }))} />
      </CollapsibleSection>

      {/* ── Active Combat: Ammo, Critical Wounds, Roll History ── */}
      {inCombat && (
        <>
          <CollapsibleSection title="Ammo Tracker" storageKey={`combat-ammo-${characterId}`} defaultExpanded={!isMobile}>
            <AmmoTracker ammo={character.ammo}
              onUpdate={(i, field, value) => update(`ammo.${i}.${field}`, value)}
              onAdd={() => updateCharacter((c) => ({ ...c, ammo: [...c.ammo, { name: 'New Ammo', quantity: 12, max: 12, enc: '0', qualities: '' }] }))}
              onRemove={(i) => updateCharacter((c) => ({ ...c, ammo: c.ammo.filter((_, j) => j !== i) }))}
              defaultCollapsed={isMobile} />
          </CollapsibleSection>
          <CollapsibleSection title="Critical Wounds" storageKey={`combat-critical-${characterId}`} defaultExpanded={!isMobile}>
            <CriticalWoundsPanel criticalWounds={character.criticalWounds}
              onAdd={() => updateCharacter((c) => ({ ...c, criticalWounds: recordCriticalWound(c.criticalWounds, { location: 'Body', description: 'New wound', effects: '', duration: '', severity: 1, healed: false }) }))}
              onHeal={(id) => updateCharacter((c) => ({ ...c, criticalWounds: healCriticalWound(c.criticalWounds, id) }))}
              onUpdate={(i, field, value) => updateCharacter((c) => ({ ...c, criticalWounds: c.criticalWounds.map((w, j) => j === i ? { ...w, [field]: value } : w) }))}
              defaultCollapsed={isMobile}
              preselectedLocation={downLocation}
              onAddWound={(wound) => { updateCharacter((c) => ({ ...c, criticalWounds: recordCriticalWound(c.criticalWounds, wound) })); setDownLocation(undefined); }} />
          </CollapsibleSection>
          <CollapsibleSection title="Roll History" storageKey={`combat-history-${characterId}`} defaultExpanded={!isMobile}>
            {rollHistory && clearHistory && <RollHistoryPanel history={rollHistory} onClear={clearHistory} defaultExpanded={true} />}
          </CollapsibleSection>
        </>
      )}

      {/* ── Hireling Combat Panel ── */}
      {character.hirelings && character.hirelings.length > 0 && (
        <HirelingCombatPanel
          hirelings={character.hirelings}
          onUpdateWounds={(id, wCur) => updateCharacter((c) => ({
            ...c,
            hirelings: (c.hirelings || []).map((h) => h.id === id ? { ...h, wCur } : h),
          }))}
          onAddCondition={(id, condition) => updateCharacter((c) => ({
            ...c,
            hirelings: (c.hirelings || []).map((h) => h.id === id ? { ...h, conditions: [...h.conditions, condition] } : h),
          }))}
          onRemoveCondition={(id, conditionIndex) => updateCharacter((c) => ({
            ...c,
            hirelings: (c.hirelings || []).map((h) => h.id === id ? { ...h, conditions: h.conditions.filter((_, i) => i !== conditionIndex) } : h),
          }))}
        />
      )}

      {/* ── START / END COMBAT button ── */}
      <button type="button" onClick={inCombat ? endCombat : startCombat}
        className={inCombat ? styles.combatBtnEnd : styles.combatBtnStart}>
        {inCombat ? 'END COMBAT' : 'START COMBAT'}
      </button>

      {/* ── Modals ── */}
      {showConditionPicker && (
        <ConditionPicker conditions={character.conditions}
          onApply={(name) => updateCharacter((c) => ({ ...c, conditions: applyCondition(c.conditions, name) }))}
          onRemove={(name) => updateCharacter((c) => ({ ...c, conditions: removeCondition(c.conditions, name) }))}
          onClose={() => setShowConditionPicker(false)} />
      )}
      {runeManagerTarget && (() => {
        const isWeapon = runeManagerTarget.type === 'weapon';
        const item = isWeapon ? character.weapons[runeManagerTarget.index] : character.armour[runeManagerTarget.index];
        if (!item) return null;
        return (
          <RuneManager itemType={runeManagerTarget.type} itemIndex={runeManagerTarget.index} itemName={item.name || 'Unnamed'}
            currentRunes={((item as { runes?: string[] }).runes) ?? []} knownRunes={character.knownRunes ?? []}
            onAddRune={(runeId) => updateCharacter((c) => {
              if (isWeapon) { const weapons = [...c.weapons]; const w = { ...weapons[runeManagerTarget.index] }; w.runes = [...(w.runes ?? []), runeId]; weapons[runeManagerTarget.index] = w; return { ...c, weapons }; }
              else { const armour = [...c.armour]; const a = { ...armour[runeManagerTarget.index] }; a.runes = [...(a.runes ?? []), runeId]; armour[runeManagerTarget.index] = a; return { ...c, armour }; }
            })}
            onRemoveRune={(runeIndex) => updateCharacter((c) => {
              if (isWeapon) { const weapons = [...c.weapons]; const w = { ...weapons[runeManagerTarget.index] }; w.runes = (w.runes ?? []).filter((_, i) => i !== runeIndex); weapons[runeManagerTarget.index] = w; return { ...c, weapons }; }
              else { const armour = [...c.armour]; const a = { ...armour[runeManagerTarget.index] }; a.runes = (a.runes ?? []).filter((_, i) => i !== runeIndex); armour[runeManagerTarget.index] = a; return { ...c, armour }; }
            })}
            onClose={() => setRuneManagerTarget(null)} />
        );
      })()}
      {showWeaponPicker && <Picker items={WEAPONS} getLabel={(w) => w.name} getGroup={(w) => w.group} onSelect={(w) => { updateCharacter((c) => ({ ...c, weapons: [...c.weapons, { ...w }] })); setShowWeaponPicker(false); }} onClose={() => setShowWeaponPicker(false)} title="Select Weapon" />}
      {showArmourPicker && <Picker items={ARMOURS} getLabel={(a) => `${a.name} (AP ${a.ap})`} onSelect={(a) => { updateCharacter((c) => ({ ...c, armour: [...c.armour, { ...a }] })); setShowArmourPicker(false); }} onClose={() => setShowArmourPicker(false)} title="Select Armour" />}
      {rollDialogState && <RollDialog skillOrCharName={rollDialogState.name} baseTarget={rollDialogState.baseTarget} defaultDifficulty={rollDialogState.defaultDifficulty} onRoll={handleRollResult} onClose={() => setRollDialogState(null)} />}
      {rollResultState && <RollResultDisplay result={rollResultState} onClose={() => setRollResultState(null)} />}
      <Toast
        message={undoToast.pending?.message ?? null}
        duration={5000}
        action={undoToast.pending ? { label: 'Undo', onAction: undoToast.undo } : undefined}
      />
    </div>
  );
}

export default CombatPage;
