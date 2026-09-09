import { useState } from 'react';
import type { Character, WeaponItem, ArmourPoints, CharacteristicKey } from '../../types/character';
import type { RollResult, DifficultyLevel } from '../../logic/dice-roller';
import { performRoll, applyDifficulty, computeSkillTarget, DIFFICULTY_MODIFIERS } from '../../logic/dice-roller';
import { findSkillForWeapon, calcWeaponDamage, RANGED_GROUPS, hasWeaponQuality } from '../../logic/weapons';
import { getBonus } from '../../logic/calculators';
import { computeOffHandTarget, calculateDamage, calculateDamagingSL } from '../../logic/combat';
import { getCombatTarget, setCombatTargetTB, setCombatTargetAP } from '../../logic/combat-target';
import { appendEvent } from '../../logic/event-log';
import { getHitLocation } from './hitLocationTable';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EmptyState } from '../shared/EmptyState';
import { StepIndicator } from './StepIndicator';
import { ChipGroup } from '../shared/ChipGroup';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Crosshair } from 'lucide-react';
import styles from './AttackFlow.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AttackFlowProps {
  weapons: WeaponItem[];
  character: Character;
  armourPoints: ArmourPoints;
  onRoll: (result: RollResult) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /**
   * Optional callback to open the weapon picker, wired to the action-oriented
   * empty state shown when the character has no weapons (ux-audit-improvements
   * Req 12.1). Optional so existing tests/usages that don't pass it still work.
   */
  onAddWeapon?: () => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AttackFlowStep = 1 | 2 | 3 | 4;

const ALL_DIFFICULTIES: DifficultyLevel[] = [
  'Very Easy', 'Easy', 'Average', 'Challenging', 'Difficult', 'Hard', 'Very Hard',
];

// ─── Component ───────────────────────────────────────────────────────────────

export function AttackFlow({ weapons, character, armourPoints, onRoll, updateCharacter, onAddWeapon }: AttackFlowProps) {
  const [selectedWeaponIndex, setSelectedWeaponIndex] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<AttackFlowStep>(1);
  const [lastRollResult, setLastRollResult] = useState<RollResult | null>(null);
  // Opponent TB/AP are read from the ad-hoc Combat_Target on combatState so they
  // persist across attacks and combat rounds until combat ends (ux-audit-improvements Req 1.2–1.6).
  const combatTarget = getCombatTarget(character);
  const opponentTB = combatTarget.tb;
  const opponentAP = combatTarget.ap;
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Challenging');
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [collapsedSteps, setCollapsedSteps] = useState<Record<number, boolean>>({});
  const [offHand, setOffHand] = useState(false);
  const [isSecondAttack, setIsSecondAttack] = useState(false);
  const [firstAttackCompleted, setFirstAttackCompleted] = useState(false);
  const [targetEngagedInMelee, setTargetEngagedInMelee] = useState(false);
  // Anchor for the net-wounds breakdown tooltip (calculated-total-tooltips steering rule).
  const [netWoundsTooltipAnchor, setNetWoundsTooltipAnchor] = useState<HTMLElement | null>(null);

  const SB = getBonus(character.chars.S.i + character.chars.S.a + character.chars.S.b);

  // Check Ambidextrous talent level for off-hand penalty reduction (Core Rulebook p.132)
  // Level 1: -10, Level 2: no penalty. Dual Wielder does NOT reduce the penalty.
  const ambidextrousTalent = character.talents.find(
    (t) => t.n.toLowerCase() === 'ambidextrous'
  );
  const ambidextrousLevel = ambidextrousTalent ? ambidextrousTalent.lvl : 0;

  // Off-hand penalty: -20 base, -10 with Ambidextrous 1, 0 with Ambidextrous 2
  const offHandPenalty = offHand ? computeOffHandTarget(0, true, ambidextrousLevel) : 0;

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

  const rangedIntoMeleePenalty = (isRanged && targetEngagedInMelee) ? -20 : 0;
  const modifiedTarget = applyDifficulty(baseTarget, difficulty) + offHandPenalty + rangedIntoMeleePenalty;

  // ── Handlers ──

  function handleSelectWeapon(index: number) {
    setSelectedWeaponIndex(index);
    setCurrentStep(2);
    setLastRollResult(null);
    // Opponent TB/AP persist via the Combat_Target — do not reset here (Req 1.4).
    setOffHand(isSecondAttack); // Second attack defaults to off-hand

    // Reset target-engaged toggle when weapon changes to non-ranged
    const weapon = weapons[index];
    const weaponIsRanged = RANGED_GROUPS.includes(weapon.group);
    if (!weaponIsRanged) {
      setTargetEngagedInMelee(false);
    }

    // Determine default difficulty
    if (character.combatState.engaged && weaponIsRanged && weapon.group !== 'Blackpowder') {
      setDifficulty('Hard');
    } else {
      setDifficulty('Challenging');
    }
  }

  function handleRollToHit() {
    const rollValue = Math.floor(Math.random() * 100) + 1;
    const result = performRoll(baseTarget + offHandPenalty + rangedIntoMeleePenalty, difficulty, skillName, rollValue);

    // Impale Crits on Tens: if enabled, weapon has Impale, roll is a multiple of 10 (not 100), and attack is a success
    if (
      character.houseRules.impaleCritsOnTens &&
      selectedWeapon &&
      /impale/i.test(selectedWeapon.qualities) &&
      result.passed &&
      rollValue % 10 === 0 &&
      rollValue !== 100
    ) {
      result.isCritical = true;
    }

    setLastRollResult(result);
    onRoll(result);

    if (result.passed) {
      setCurrentStep(3);
    }
  }

  function handleNewAttack() {
    setCurrentStep(1);
    setLastRollResult(null);
    // Opponent TB/AP persist via the Combat_Target — do not reset here (Req 1.4).
    setOffHand(false);
    setIsSecondAttack(false);
    setFirstAttackCompleted(false);
    setTargetEngagedInMelee(false);
  }

  function handleSecondAttack() {
    setCurrentStep(1);
    setLastRollResult(null);
    // Opponent TB/AP persist via the Combat_Target — do not reset here (Req 1.4).
    setIsSecondAttack(true);
    setFirstAttackCompleted(true);
    setOffHand(true);
  }

  function toggleStepCollapse(step: number) {
    setCollapsedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  }

  /**
   * Append a `combat.attack` event to the unified event log describing the
   * produced attack result (ux-audit-improvements Req 2.3, dep: unified-event-log).
   *
   * Called once when the final damage result is produced (the Step 3 → Step 4
   * "Calculate Damage" action), never on every render, to avoid double-logging.
   * This is display/audit only — AttackFlow does NOT apply wounds to the sheet
   * owner (Req 2.4); the app never tracks an opponent's wounds either.
   */
  function logAttackResult(result: RollResult) {
    const outcome = result.isFumble
      ? 'fumble'
      : result.isCritical
        ? 'crit'
        : result.passed
          ? 'hit'
          : 'miss';
    const weaponName = selectedWeapon?.name || 'weapon';
    const summary = `Attack with ${weaponName}: ${outcome} — ${effectiveWounds} net wound${effectiveWounds === 1 ? '' : 's'}`;
    // Defensive guard: updateCharacter is a required prop, but guard against a
    // non-function value so producing an attack result never throws an
    // unhandled error (no-op when not wired). Behavior is otherwise unchanged.
    if (typeof updateCharacter === 'function') {
      updateCharacter((c) =>
        appendEvent(c, {
          category: 'combat',
          type: 'combat.attack',
          summary,
          payload: {
            weapon: weaponName,
            outcome,
            netWounds: effectiveWounds,
            weaponDamage: weaponDamage.num ?? 0,
            sl: effectiveSL,
            totalDamage,
            opponentTB,
            opponentAP,
          },
        }),
      );
    }
  }

  // ── Hit location (Step 3) ──
  const hitLocationResult = lastRollResult && lastRollResult.passed
    ? getHitLocation(lastRollResult.roll)
    : null;

  // ── Damage calculation (Step 4) ──
  const weaponDamage = selectedWeapon
    ? calcWeaponDamage(selectedWeapon, SB, character.talents, selectedWeapon.runes ?? [], character.houseRules.rangedDamageSBMode)
    : { num: null, breakdown: '' };

  const sl = lastRollResult?.sl ?? 0;

  // Damaging quality: use max(units digit, SL) as effective SL
  const isDamaging = selectedWeapon ? hasWeaponQuality(selectedWeapon, 'Damaging') : false;
  const damagingResult = isDamaging && lastRollResult && lastRollResult.passed
    ? calculateDamagingSL(lastRollResult.roll, sl)
    : null;
  const effectiveSL = damagingResult ? damagingResult.effectiveSL : sl;

  const totalDamage = (weaponDamage.num ?? 0) + effectiveSL;
  const netWounds = Math.max(0, totalDamage - opponentTB - opponentAP);
  const effectiveWounds = (() => {
    if (character.houseRules.min1Wound && totalDamage > opponentTB + opponentAP) {
      // RAW: minimum 1 wound when damage exceeds reduction
      return calculateDamage(weaponDamage.num ?? 0, sl, opponentAP, opponentTB);
    }
    // No min-1 rule or damage doesn't exceed reduction
    return netWounds;
  })();

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
          <label className={styles.difficultyLabel} id="difficulty-chip-label">Difficulty:</label>
          {/* Difficulty as a chip group (radiogroup) rather than a native select
              (ux-audit-improvements Req 10.1). All 7 difficulty levels are
              preserved, each chip showing its test modifier; the selected chip
              is indicated and chips are ≥44px for touch (Req 10.3–10.5). */}
          <ChipGroup<DifficultyLevel>
            ariaLabel="Difficulty"
            value={difficulty}
            onChange={(d) => setDifficulty(d)}
            options={ALL_DIFFICULTIES.map((d) => ({
              value: d,
              label: `${d} (${DIFFICULTY_MODIFIERS[d] >= 0 ? '+' : ''}${DIFFICULTY_MODIFIERS[d]})`,
            }))}
          />
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Target</span>
            <span className={styles.statChipValue}>{modifiedTarget}</span>
          </div>
        </div>

        {/* Off-Hand toggle for two-weapon fighting */}
        <div className={styles.infoRow}>
          <button
            type="button"
            className={offHand ? styles.offHandBtnActive : styles.offHandBtn}
            onClick={() => setOffHand(!offHand)}
            aria-pressed={offHand}
            aria-label="Off-Hand attack"
          >
            🗡️ Off-Hand
          </button>
          {offHand && ambidextrousLevel === 0 && (
            <span className={styles.penaltyReminder}>−20 penalty (no Ambidextrous talent)</span>
          )}
          {offHand && ambidextrousLevel === 1 && (
            <span className={styles.penaltyReminder}>−10 penalty (Ambidextrous 1)</span>
          )}
          {offHand && ambidextrousLevel >= 2 && (
            <span className={styles.dualWielderNote}>No penalty (Ambidextrous 2)</span>
          )}
        </div>

        {/* Target Engaged in Melee toggle for ranged attacks */}
        {isRanged && (
          <div className={styles.infoRow}>
            <button
              type="button"
              data-testid="target-engaged-in-melee-toggle"
              className={targetEngagedInMelee ? styles.offHandBtnActive : styles.offHandBtn}
              onClick={() => setTargetEngagedInMelee(!targetEngagedInMelee)}
              aria-pressed={targetEngagedInMelee}
              aria-label="Target Engaged in Melee"
            >
              🎯 Target Engaged in Melee
            </button>
            {targetEngagedInMelee && (
              <span className={styles.penaltyReminder}>Target Engaged in Melee (−20)</span>
            )}
          </div>
        )}

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
            onClick={() => {
              // Produce the final attack result: advance to Step 4 and log it once
              // (Req 2.3). This is the single point the damage result is produced.
              setCurrentStep(4);
              if (lastRollResult) logAttackResult(lastRollResult);
            }}
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
            <span className={styles.statChipValue}>{effectiveSL >= 0 ? '+' : ''}{effectiveSL}</span>
          </div>
          <span className={styles.operatorSymbol}>=</span>
          <div className={styles.statChip}>
            <span className={styles.statChipLabel}>Total</span>
            <span className={styles.bigDamage}>{totalDamage}</span>
          </div>
        </div>

        {damagingResult && (
          <div className={styles.breakdownText} data-testid="damaging-breakdown">
            Damaging: Units digit ({damagingResult.unitsDigit}) vs SL ({damagingResult.originalSL}) → using {damagingResult.effectiveSL}
          </div>
        )}

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
            onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); updateCharacter((c) => setCombatTargetTB(c, v)); }}
            className={styles.inputStyle}
            aria-label="Opponent Toughness Bonus"
            min={0}
          />
          <label className={styles.difficultyLabel}>Opponent AP:</label>
          <input
            type="number"
            value={opponentAP}
            onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); updateCharacter((c) => setCombatTargetAP(c, v)); }}
            className={styles.inputStyle}
            aria-label="Opponent Armour Points"
            min={0}
          />
        </div>

        {/* Net-wounds calculated total with a breakdown tooltip
            (calculated-total-tooltips steering rule): weaponDamage + SL − TB − AP.
            Net-wounds math is unchanged and cites the rulebook via combat.ts. */}
        <div className={styles.netWoundsBox}>
          <div className={styles.netWoundsRow}>
            <span className={styles.netWoundsLabel}>Net Wounds</span>
            <TooltipTriggerCell
              tooltipId="tooltip-attack-net-wounds"
              displayValue={effectiveWounds}
              isTooltipOpen={netWoundsTooltipAnchor !== null}
              onOpen={(anchorEl) => setNetWoundsTooltipAnchor(anchorEl)}
              onClose={() => setNetWoundsTooltipAnchor(null)}
              className={styles.netWoundsValue}
              ariaLabel={`Net wounds ${effectiveWounds}. Show breakdown.`}
            />
          </div>
        </div>
        {netWoundsTooltipAnchor && (
          <Tooltip
            anchorEl={netWoundsTooltipAnchor}
            title="Net Wounds"
            onClose={() => setNetWoundsTooltipAnchor(null)}
            id="tooltip-attack-net-wounds"
          >
            <div className={styles.netWoundsBreakdown}>
              Weapon {weaponDamage.num ?? 0} + SL {effectiveSL >= 0 ? '+' : ''}{effectiveSL} − TB {opponentTB} − AP {opponentAP} = {netWounds}
              {effectiveWounds !== netWounds ? ' → min 1 wound (house rule)' : ''}
            </div>
          </Tooltip>
        )}

        <div className={styles.newAttackMargin}>
          {!isSecondAttack && !firstAttackCompleted && (
            <button type="button" className={styles.secondAttackBtn} onClick={handleSecondAttack}>
              🗡️ Second Attack (Off-Hand)
            </button>
          )}
          <button type="button" className={styles.newAttackBtn} onClick={handleNewAttack}>
            🔄 New Attack
          </button>
        </div>
      </div>
    );

    return <div className={`${styles.stepContainer} ${styles.damageTint}`}>{content}</div>;
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
    // Action-oriented empty state directing to the add-weapon action
    // (ux-audit-improvements Req 12.1). The "Add Weapon" action is only shown
    // when a callback is wired (CombatPage opens the weapon picker); otherwise
    // the description still tells the user what to do.
    return (
      <Card>
        <SectionHeader icon={Crosshair} title="Attack Flow" />
        <EmptyState
          icon={Crosshair}
          heading="No weapons available"
          description="Add a weapon to use the Attack Flow."
          compact
          action={onAddWeapon ? { label: 'Add Weapon', onClick: onAddWeapon } : undefined}
        />
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
        <>
          <StepIndicator
            steps={['Weapon', 'Roll', 'Damage', 'Result']}
            currentStep={currentStep - 1}
          />
          <div className={styles.stepsWrapper}>
            {renderStep1()}
            {renderStep2()}
            {renderStep3()}
            {renderStep4()}
          </div>
        </>
      )}
    </Card>
  );
}
