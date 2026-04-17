import { useState, useEffect } from 'react';
import type { Character, WeaponItem, ArmourPoints, CharacteristicKey } from '../../types/character';
import type { RollResult, DifficultyLevel } from '../../logic/dice-roller';
import { performRoll, applyDifficulty, computeSkillTarget, DIFFICULTY_MODIFIERS } from '../../logic/dice-roller';
import { findSkillForWeapon, calcWeaponDamage, RANGED_GROUPS } from '../../logic/weapons';
import { getBonus } from '../../logic/calculators';
import { getHitLocation } from './hitLocationTable';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Crosshair } from 'lucide-react';
import styles from './AttackFlow.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AttackFlowProps {
  weapons: WeaponItem[];
  character: Character;
  armourPoints: ArmourPoints;
  onRoll: (result: RollResult) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AttackFlowStep = 1 | 2 | 3 | 4;

const ALL_DIFFICULTIES: DifficultyLevel[] = [
  'Very Easy', 'Easy', 'Average', 'Challenging', 'Difficult', 'Hard', 'Very Hard',
];

// ─── Component ───────────────────────────────────────────────────────────────

export function AttackFlow({ weapons, character, armourPoints, onRoll }: AttackFlowProps) {
  const [selectedWeaponIndex, setSelectedWeaponIndex] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<AttackFlowStep>(1);
  const [lastRollResult, setLastRollResult] = useState<RollResult | null>(null);
  const [opponentTB, setOpponentTB] = useState(0);
  const [opponentAP, setOpponentAP] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Challenging');
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsedSteps, setCollapsedSteps] = useState<Record<number, boolean>>({});

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const SB = getBonus(character.chars.S.i + character.chars.S.a + character.chars.S.b);

  // ── Derived state for selected weapon ──
  const selectedWeapon = selectedWeaponIndex !== null ? weapons[selectedWeaponIndex] : null;
  const isRanged = selectedWeapon ? RANGED_GROUPS.includes(selectedWeapon.group) : false;

  const skill = selectedWeapon
    ? findSkillForWeapon(selectedWeapon, character.bSkills, character.aSkills)
    : null;

  const skillName = selectedWeapon
    ? (skill?.n ?? (isRanged ? `Ranged (${selectedWeapon.group})` : `Melee (${selectedWeapon.group})`))
    : '';

  const baseTarget = (() => {
    if (!skill) return 0;
    const charVal = character.chars[skill.c as CharacteristicKey];
    if (charVal) {
      return computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a);
    }
    return skill.a;
  })();

  const modifiedTarget = applyDifficulty(baseTarget, difficulty);

  // ── Handlers ──

  function handleSelectWeapon(index: number) {
    setSelectedWeaponIndex(index);
    setCurrentStep(2);
    setLastRollResult(null);
    setOpponentTB(0);
    setOpponentAP(0);

    // Determine default difficulty
    const weapon = weapons[index];
    const weaponIsRanged = RANGED_GROUPS.includes(weapon.group);
    if (character.combatState.engaged && weaponIsRanged && weapon.group !== 'Blackpowder') {
      setDifficulty('Hard');
    } else {
      setDifficulty('Challenging');
    }
  }

  function handleRollToHit() {
    const rollValue = Math.floor(Math.random() * 100) + 1;
    const result = performRoll(baseTarget, difficulty, skillName, rollValue);
    setLastRollResult(result);
    onRoll(result);

    if (result.passed) {
      setCurrentStep(3);
    }
  }

  function handleNewAttack() {
    setCurrentStep(1);
    setLastRollResult(null);
    setOpponentTB(0);
    setOpponentAP(0);
  }

  function toggleStepCollapse(step: number) {
    setCollapsedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  }

  // ── Hit location (Step 3) ──
  const hitLocationResult = lastRollResult && lastRollResult.passed
    ? getHitLocation(lastRollResult.roll)
    : null;

  // ── Damage calculation (Step 4) ──
  const weaponDamage = selectedWeapon
    ? calcWeaponDamage(selectedWeapon, SB, character.talents, selectedWeapon.runes ?? [])
    : { num: null, breakdown: '' };

  const sl = lastRollResult?.sl ?? 0;
  const totalDamage = (weaponDamage.num ?? 0) + sl;
  const netWounds = Math.max(0, totalDamage - opponentTB - opponentAP);
  const effectiveWounds = totalDamage > opponentTB + opponentAP && netWounds < 1 ? 1 : netWounds;

  // ── Result display helper ──
  function getResultClass(result: RollResult): string {
    if (result.isFumble) return styles.fumbleBox;
    if (result.isCritical) return styles.criticalBox;
    if (result.passed) return styles.successBox;
    return styles.failureBox;
  }

  function getResultLabel(result: RollResult): string {
    if (result.isFumble) return '💀 FUMBLE!';
    if (result.isCritical) return '⚡ CRITICAL HIT!';
    if (result.passed) return '✓ HIT';
    return '✗ MISS';
  }

  // ── Step rendering helpers ──

  function renderStep1() {
    const content = (
      <div>
        <div className={styles.stepLabel}>Step 1 — Select Weapon</div>
        {weapons.length === 0 && (
          <div className={styles.noWeaponsMsg}>
            No weapons available.
          </div>
        )}
        <div className={styles.weaponBtnGroup}>
          {weapons.map((w, i) => (
            <button
              key={i}
              type="button"
              className={selectedWeaponIndex === i ? styles.weaponBtnSelected : styles.weaponBtn}
              onClick={() => handleSelectWeapon(i)}
              aria-label={`Select ${w.name || 'weapon'}`}
            >
              {w.name || 'Unnamed'}
            </button>
          ))}
        </div>
      </div>
    );

    if (isMobile && currentStep > 1) {
      return renderCollapsibleStep(1, 'Step 1 — Select Weapon', content);
    }
    return <div className={styles.stepContainer}>{content}</div>;
  }

  function renderStep2() {
    if (currentStep < 2) return null;

    const content = (
      <div>
        <div className={styles.stepLabel}>Step 2 — Roll to Hit</div>
        <div className={styles.infoRow}>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Skill</span>
            <span className={styles.statChipValuePrimary}>{skillName}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Base</span>
            <span className={styles.statChipValue}>{baseTarget}</span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <label className={styles.difficultyLabel}>Difficulty:</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
            className={styles.selectStyle}
            aria-label="Difficulty"
          >
            {ALL_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d} ({DIFFICULTY_MODIFIERS[d] >= 0 ? '+' : ''}{DIFFICULTY_MODIFIERS[d]})
              </option>
            ))}
          </select>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Target</span>
            <span className={styles.statChipValue}>{modifiedTarget}</span>
          </div>
        </div>

        {!lastRollResult && (
          <button
            type="button"
            className={styles.rollBtn}
            onClick={handleRollToHit}
            aria-label="Roll to hit"
          >
            🎲 ROLL TO HIT
          </button>
        )}

        {lastRollResult && (
          <div className={styles.resultMargin}>
            <div className={getResultClass(lastRollResult)}>
              <div className={styles.resultHeader}>
                {getResultLabel(lastRollResult)}
              </div>
              <div>
                Rolled <strong>{lastRollResult.roll}</strong> vs target <strong>{lastRollResult.targetNumber}</strong>
                {' — '}SL <strong>{lastRollResult.sl >= 0 ? '+' : ''}{lastRollResult.sl}</strong>
              </div>
              <div className={styles.resultOutcome}>
                {lastRollResult.outcome}
              </div>
            </div>

            {!lastRollResult.passed && (
              <div className={styles.newAttackMargin}>
                <button type="button" className={styles.newAttackBtn} onClick={handleNewAttack}>
                  🔄 New Attack
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );

    if (isMobile && currentStep > 2) {
      return renderCollapsibleStep(2, 'Step 2 — Roll to Hit', content);
    }
    return <div className={styles.stepContainer}>{content}</div>;
  }

  function renderStep3() {
    if (!lastRollResult || !lastRollResult.passed || !hitLocationResult) return null;
    if (currentStep < 3) return null;

    const ownAP = armourPoints[hitLocationResult.apKey];

    const content = (
      <div>
        <div className={styles.stepLabel}>Step 3 — Hit Location</div>
        <div className={styles.infoRow}>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Roll</span>
            <span className={styles.statChipValue}>{lastRollResult.roll}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Reversed</span>
            <span className={styles.statChipValue}>{String(hitLocationResult.reversed).padStart(2, '0')}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Location</span>
            <span className={styles.statChipValueParchment}>{hitLocationResult.location}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Your AP</span>
            <span className={styles.statChipValue}>{ownAP}</span>
          </div>
        </div>
        {currentStep === 3 && (
          <button
            type="button"
            className={styles.calcDamageBtn}
            onClick={() => setCurrentStep(4)}
          >
            → Calculate Damage
          </button>
        )}
      </div>
    );

    if (isMobile && currentStep > 3) {
      return renderCollapsibleStep(3, 'Step 3 — Hit Location', content);
    }
    return <div className={styles.stepContainer}>{content}</div>;
  }

  function renderStep4() {
    if (!lastRollResult || !lastRollResult.passed) return null;
    if (currentStep < 4) return null;

    const content = (
      <div>
        <div className={styles.stepLabel}>Step 4 — Damage Calculation</div>

        <div className={styles.infoRow}>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Weapon Dmg</span>
            <span className={styles.statChipValue}>{weaponDamage.num ?? 0}</span>
          </div>
          <span className={styles.operatorSymbol}>+</span>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>SL</span>
            <span className={styles.statChipValue}>{sl >= 0 ? '+' : ''}{sl}</span>
          </div>
          <span className={styles.operatorSymbol}>=</span>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Total</span>
            <span className={styles.bigDamage}>{totalDamage}</span>
          </div>
        </div>

        {weaponDamage.breakdown && (
          <div className={styles.breakdownText}>
            Breakdown: {weaponDamage.breakdown}
          </div>
        )}

        <div className={styles.opponentRow}>
          <label className={styles.difficultyLabel}>Opponent TB:</label>
          <input
            type="number"
            value={opponentTB}
            onChange={(e) => setOpponentTB(Math.max(0, Number(e.target.value) || 0))}
            className={styles.inputStyle}
            aria-label="Opponent Toughness Bonus"
            min={0}
          />
          <label className={styles.difficultyLabel}>Opponent AP:</label>
          <input
            type="number"
            value={opponentAP}
            onChange={(e) => setOpponentAP(Math.max(0, Number(e.target.value) || 0))}
            className={styles.inputStyle}
            aria-label="Opponent Armour Points"
            min={0}
          />
        </div>

        <div className={styles.netWoundsBox}>
          <div className={styles.netWoundsRow}>
            <span className={styles.netWoundsLabel}>Net Wounds</span>
            <span className={styles.netWoundsValue}>
              {effectiveWounds}
            </span>
          </div>
          <div className={styles.netWoundsBreakdown}>
            {totalDamage} − {opponentTB} (TB) − {opponentAP} (AP) = {netWounds}
            {effectiveWounds !== netWounds ? ' → min 1 wound' : ''}
          </div>
        </div>

        <div className={styles.newAttackMargin}>
          <button type="button" className={styles.newAttackBtn} onClick={handleNewAttack}>
            🔄 New Attack
          </button>
        </div>
      </div>
    );

    return <div className={styles.stepContainer}>{content}</div>;
  }

  function renderCollapsibleStep(step: number, title: string, content: React.ReactNode) {
    const isCollapsed = collapsedSteps[step] ?? false;
    return (
      <div className={styles.stepContainer}>
        <div
          className={styles.mobileStepHeader}
          onClick={() => toggleStepCollapse(step)}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`Toggle ${title}`}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStepCollapse(step); } }}
        >
          <span className={styles.stepLabelInline}>{title}</span>
          <span className={styles.chevron}>{isCollapsed ? '▸' : '▾'}</span>
        </div>
        {!isCollapsed && <div className={styles.collapsedContent}>{content}</div>}
      </div>
    );
  }

  // ── Main render ──

  if (weapons.length === 0) {
    return (
      <Card>
        <SectionHeader icon={Crosshair} title="Attack Flow" />
        <div className={styles.emptyMessage}>
          No weapons available. Add weapons to use the Attack Flow.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.panelHeader} onClick={() => setCollapsed(!collapsed)} role="button" tabIndex={0}
        aria-expanded={!collapsed} aria-label="Toggle Attack Flow panel"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } }}
      >
        <SectionHeader icon={Crosshair} title="Attack Flow" />
        <button type="button" className={styles.collapseBtn} tabIndex={-1} aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </button>
      </div>

      {!collapsed && (
        <div className={styles.stepsWrapper}>
          {renderStep1()}
          {renderStep2()}
          {renderStep3()}
          {renderStep4()}
        </div>
      )}
    </Card>
  );
}
