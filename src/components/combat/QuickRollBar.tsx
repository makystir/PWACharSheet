import { useState, useMemo } from 'react';
import type { Character, CharacteristicKey, Skill } from '../../types/character';
import { computeSkillTarget, type RollResult } from '../../logic/dice-roller';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Dice6 } from 'lucide-react';
import styles from './QuickRollBar.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface QuickRollBarProps {
  character: Character;
  onRoll: (result: RollResult) => void;
}

// ─── Default combat skills (9.2) ─────────────────────────────────────────────

const DEFAULT_SKILL_NAMES = [
  'Dodge',
  'Melee (Basic)',
  'Cool',
  'Endurance',
  'Athletics',
  'Perception',
];

// ─── Skill entry used for rendering ──────────────────────────────────────────

interface QuickSkillEntry {
  name: string;
  characteristic: CharacteristicKey;
  advances: number;
  target: number;
}

// ─── Build the skill list (9.2, 9.3, 9.4) ───────────────────────────────────

function isCombatSpecialization(skillName: string): boolean {
  return (
    (skillName.startsWith('Melee (') && skillName !== 'Melee (Basic)' && skillName !== 'Melee ()') ||
    skillName.startsWith('Ranged (')
  );
}

function buildQuickSkills(character: Character): QuickSkillEntry[] {
  const allSkills: Skill[] = [...character.bSkills, ...character.aSkills];
  const seen = new Set<string>();
  const result: QuickSkillEntry[] = [];

  // 9.2: Add default skills first
  for (const name of DEFAULT_SKILL_NAMES) {
    const skill = allSkills.find(s => s.n === name);
    if (skill && !seen.has(skill.n)) {
      seen.add(skill.n);
      const charKey = skill.c as CharacteristicKey;
      const charVal = character.chars[charKey];
      const target = charVal
        ? computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a)
        : skill.a;
      result.push({
        name: skill.n,
        characteristic: charKey,
        advances: skill.a,
        target,
      });
    }
  }

  // 9.3: Scan for additional Melee/Ranged specializations with advances > 0
  for (const skill of allSkills) {
    if (seen.has(skill.n)) continue;
    if (isCombatSpecialization(skill.n) && skill.a > 0) {
      seen.add(skill.n);
      const charKey = skill.c as CharacteristicKey;
      const charVal = character.chars[charKey];
      const target = charVal
        ? computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a)
        : skill.a;
      result.push({
        name: skill.n,
        characteristic: charKey,
        advances: skill.a,
        target,
      });
    }
  }

  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickRollBar({ character, onRoll }: QuickRollBarProps) {
  const [rollDialogState, setRollDialogState] = useState<{
    name: string;
    baseTarget: number;
  } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);

  // 9.2, 9.3, 9.4: Build the skill list with computed targets
  const quickSkills = useMemo(() => buildQuickSkills(character), [character]);

  // 9.6: Open RollDialog pre-populated with skill name and base target
  function handleSkillTap(entry: QuickSkillEntry) {
    setRollDialogState({ name: entry.name, baseTarget: entry.target });
  }

  // 9.7: On roll result, call onRoll callback and display result
  function handleRollResult(result: RollResult) {
    setRollDialogState(null);
    setRollResultState(result);
    onRoll(result);
  }

  function handleCloseResult() {
    setRollResultState(null);
  }

  return (
    <Card>
      <SectionHeader icon={Dice6} title="Quick Rolls" />

      {/* 9.5 & 9.8: Horizontally scrollable row of skill buttons */}
      <div className={styles.barContainer} style={{ overflowX: 'auto', whiteSpace: 'nowrap' }} data-testid="quick-roll-bar">
        {quickSkills.map(entry => (
          <button
            key={entry.name}
            type="button"
            className={styles.skillButton}
            style={{ flexShrink: 0 }}
            onClick={() => handleSkillTap(entry)}
            aria-label={`Roll ${entry.name}`}
          >
            🎲 {entry.name} {entry.target}
          </button>
        ))}
      </div>

      {/* 9.6: RollDialog modal */}
      {rollDialogState && (
        <RollDialog
          skillOrCharName={rollDialogState.name}
          baseTarget={rollDialogState.baseTarget}
          onRoll={handleRollResult}
          onClose={() => setRollDialogState(null)}
        />
      )}

      {/* 9.7: RollResultDisplay modal */}
      {rollResultState && (
        <RollResultDisplay
          result={rollResultState}
          onClose={handleCloseResult}
        />
      )}
    </Card>
  );
}
