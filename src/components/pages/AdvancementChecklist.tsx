import { useState } from 'react';
import type { CharacteristicKey } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import { ListChecks } from 'lucide-react';
import styles from './AdvancementChecklist.module.css';

/**
 * Advancement completion checklist (Req 7.1–7.5).
 *
 * This is a PRESENTATION LAYER ONLY. All completion determinations
 * (which characteristics/skills/talents are met vs. outstanding, and the
 * completion threshold) are computed by AdvancementPage and passed in as
 * props, so there is a single source of truth. The underlying completion
 * logic derives from the WFRP4e career-advancement rules already implemented
 * in AdvancementPage (Core p.44–47: career completion thresholds — L1 5, L2 10,
 * L3 15, L4 20, L5 25 advances). This component neither re-derives nor diverges
 * from that logic; it only renders met/outstanding state.
 */

const CHAR_FULL_NAMES: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness',
  I: 'Initiative', Ag: 'Agility', Dex: 'Dexterity', Int: 'Intelligence',
  WP: 'Willpower', Fel: 'Fellowship',
};

export interface AdvancementChecklistProps {
  /** Career name for the heading context (may be empty). */
  career: string;
  /** Career level title for the heading context (may be empty). */
  careerLevel: string;
  /** Per-characteristic progress: name, current advances, and whether met. */
  charsProgress: { name: string; advances: number; met: boolean }[];
  /** Whether the characteristic requirement for this level is met. */
  charsMet: boolean;
  /** Names of the qualifying career skills currently at/above the threshold. */
  skillsWithAdvances: string[];
  /** Number of qualifying skills required at this level (min(8, careerSkills)). */
  skillsRequired: number;
  /** Whether the skill requirement for this level is met. */
  skillsMet: boolean;
  /** Names of the current-level career talents the character owns. */
  talentsOwned: string[];
  /** Whether the talent requirement for this level is met. */
  talentsMet: boolean;
  /** Advances required to count a characteristic/skill toward completion. */
  completionThreshold: number;
  /** True when the character is at the maximum level of the current career. */
  isMaxLevel: boolean;
}

type OpenTooltip =
  | { kind: 'chars' | 'skills' | 'talents'; anchorEl: HTMLElement }
  | null;

export function AdvancementChecklist({
  career,
  careerLevel,
  charsProgress,
  charsMet,
  skillsWithAdvances,
  skillsRequired,
  skillsMet,
  talentsOwned,
  talentsMet,
  completionThreshold,
  isMaxLevel,
}: AdvancementChecklistProps) {
  const [openTooltip, setOpenTooltip] = useState<OpenTooltip>(null);

  const charsMetCount = charsProgress.filter(c => c.met).length;
  const outstandingChars = charsProgress.filter(c => !c.met);
  const skillsMetCount = skillsWithAdvances.length;
  const skillsRemaining = Math.max(0, skillsRequired - skillsMetCount);

  const close = () => setOpenTooltip(null);
  const openChars = (anchorEl: HTMLElement) => setOpenTooltip({ kind: 'chars', anchorEl });
  const openSkills = (anchorEl: HTMLElement) => setOpenTooltip({ kind: 'skills', anchorEl });
  const openTalents = (anchorEl: HTMLElement) => setOpenTooltip({ kind: 'talents', anchorEl });

  return (
    <Card>
      <SectionHeader icon={ListChecks} title="What's Left This Level" />

      {isMaxLevel ? (
        <div className={styles.maxLevel} role="status">
          {career ? `${career} — ${careerLevel} is at its maximum level.` : 'This career is at its maximum level.'}
        </div>
      ) : (
        <ul className={styles.list}>
          {/* Characteristics requirement (Req 7.2, 7.3) */}
          <li className={charsMet ? styles.itemMet : styles.itemUnmet}>
            <span className={styles.status} aria-hidden="true">{charsMet ? '✓' : '✗'}</span>
            <span className={styles.label}>Characteristics</span>
            <TooltipTriggerCell
              tooltipId="advancement-checklist-chars"
              className={styles.total}
              ariaLabel={`Characteristics requirement: ${charsMetCount} of ${charsProgress.length} at ${completionThreshold}+ advances. Show breakdown.`}
              displayValue={`${charsMetCount} / ${charsProgress.length}`}
              isTooltipOpen={openTooltip?.kind === 'chars'}
              onOpen={openChars}
              onClose={close}
            />
            {!charsMet && (
              <span className={styles.remaining}>
                {outstandingChars.length > 0
                  ? `need ${outstandingChars.map(c => c.name).join(', ')}`
                  : ''}
              </span>
            )}
          </li>

          {/* Skills requirement (Req 7.2, 7.3) */}
          <li className={skillsMet ? styles.itemMet : styles.itemUnmet}>
            <span className={styles.status} aria-hidden="true">{skillsMet ? '✓' : '✗'}</span>
            <span className={styles.label}>Skills</span>
            <TooltipTriggerCell
              tooltipId="advancement-checklist-skills"
              className={styles.total}
              ariaLabel={`Skills requirement: ${skillsMetCount} of ${skillsRequired} at ${completionThreshold}+ advances. Show breakdown.`}
              displayValue={`${skillsMetCount} / ${skillsRequired}`}
              isTooltipOpen={openTooltip?.kind === 'skills'}
              onOpen={openSkills}
              onClose={close}
            />
            {!skillsMet && (
              <span className={styles.remaining}>
                {skillsRemaining} more at {completionThreshold}+
              </span>
            )}
          </li>

          {/* Talent requirement (Req 7.2, 7.3) */}
          <li className={talentsMet ? styles.itemMet : styles.itemUnmet}>
            <span className={styles.status} aria-hidden="true">{talentsMet ? '✓' : '✗'}</span>
            <span className={styles.label}>Talent</span>
            <TooltipTriggerCell
              tooltipId="advancement-checklist-talents"
              className={styles.total}
              ariaLabel={`Talent requirement: ${talentsOwned.length} of 1 acquired. Show breakdown.`}
              displayValue={`${Math.min(talentsOwned.length, 1)} / 1`}
              isTooltipOpen={openTooltip?.kind === 'talents'}
              onOpen={openTalents}
              onClose={close}
            />
            {!talentsMet && (
              <span className={styles.remaining}>acquire 1 career talent</span>
            )}
          </li>
        </ul>
      )}

      {openTooltip?.kind === 'chars' && (
        <Tooltip
          id="advancement-checklist-chars"
          anchorEl={openTooltip.anchorEl}
          title="Characteristics requirement"
          onClose={close}
        >
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipFormula}>
              Met {charsMetCount} + Outstanding {charsProgress.length - charsMetCount} = {charsProgress.length} required
            </div>
            <div className={styles.tooltipNote}>Each needs {completionThreshold}+ advances.</div>
            <ul className={styles.tooltipList}>
              {charsProgress.map(c => (
                <li key={c.name} className={c.met ? styles.tooltipMet : styles.tooltipUnmet}>
                  {c.met ? '✓' : '✗'} {CHAR_FULL_NAMES[c.name as CharacteristicKey] ?? c.name}: {c.advances} adv
                </li>
              ))}
            </ul>
          </div>
        </Tooltip>
      )}

      {openTooltip?.kind === 'skills' && (
        <Tooltip
          id="advancement-checklist-skills"
          anchorEl={openTooltip.anchorEl}
          title="Skills requirement"
          onClose={close}
        >
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipFormula}>
              Met {skillsMetCount} + Remaining {skillsRemaining} = {skillsRequired} required
            </div>
            <div className={styles.tooltipNote}>Each needs {completionThreshold}+ advances.</div>
            {skillsWithAdvances.length > 0 && (
              <ul className={styles.tooltipList}>
                {skillsWithAdvances.map(s => (
                  <li key={s} className={styles.tooltipMet}>✓ {s}</li>
                ))}
              </ul>
            )}
          </div>
        </Tooltip>
      )}

      {openTooltip?.kind === 'talents' && (
        <Tooltip
          id="advancement-checklist-talents"
          anchorEl={openTooltip.anchorEl}
          title="Talent requirement"
          onClose={close}
        >
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipFormula}>
              Acquired {talentsOwned.length} of 1 required
            </div>
            {talentsOwned.length > 0 ? (
              <ul className={styles.tooltipList}>
                {talentsOwned.map(t => (
                  <li key={t} className={styles.tooltipMet}>✓ {t}</li>
                ))}
              </ul>
            ) : (
              <div className={styles.tooltipNote}>No current-level career talent acquired yet.</div>
            )}
          </div>
        </Tooltip>
      )}
    </Card>
  );
}
