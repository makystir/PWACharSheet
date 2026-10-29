import { useState } from 'react';
import { Users, ShieldCheck, Gift, Dices, AlertTriangle, Trash2 } from 'lucide-react';
import type { Character, GangMembership } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EmptyState } from '../shared/EmptyState';
import { AddButton } from '../shared/AddButton';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import {
  computeMonthlyDues,
  addMembership,
  removeMembership,
  updateMembership,
  CRIMINAL_ORGANISATION,
  CRIMINAL_ORGANISATION_ARTIFACT_NOTE,
  PERKS_BY_LEVEL,
  PERKS_LAWYERS_DISPLAY_HEADER,
  PERKS_ARTIFACT_NOTE,
  CRIMINAL_EVENTS,
  resolveCriminalEvent,
  type CriminalEventRow,
} from '../../logic/organised-crime';
import styles from './OrganisedCrimePanel.module.css';

/**
 * Toggle-gated Organised Crime tracker + reference (Deft Steps, Light Fingers —
 * "Organised Crime"). Gated by houseRules.useOrganisedCrime upstream
 * (EndeavoursPage); this panel only mounts when the rule is on.
 *
 * Player-driven: the membership tracker mutates character.organisedCrime through
 * the pure memberships helpers; the dues figure is a CALCULATED TOTAL with a
 * breakdown tooltip. The three transcribed tables (Criminal Organisation, Perks
 * by Level, Criminal Events) are read-only reference. The "Roll a Criminal
 * Event" helper is display-only — it applies no mechanics and uses the app's
 * existing d100 RNG idiom (no new RNG).
 */
interface OrganisedCrimePanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/** Which dues tooltip (if any) is currently open, keyed by membership id. */
type OpenTooltip = { id: string; anchorEl: HTMLElement } | null;

const ORG_LEVELS: readonly (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

export function OrganisedCrimePanel({ character, updateCharacter }: OrganisedCrimePanelProps) {
  const memberships = character.organisedCrime?.memberships ?? [];
  const [openTooltip, setOpenTooltip] = useState<OpenTooltip>(null);
  const [lastEvent, setLastEvent] = useState<{ roll: number; row: CriminalEventRow } | null>(null);

  const closeTooltip = () => setOpenTooltip(null);

  /** Apply a pure membership-list transform and persist, dropping the optional
   *  field entirely when the last membership is removed (zero footprint). */
  const mutateMemberships = (
    transform: (list: readonly GangMembership[]) => GangMembership[],
  ) => {
    updateCharacter((c) => {
      const current = c.organisedCrime?.memberships ?? [];
      const next = transform(current);
      if (next.length === 0) {
        const rest = { ...c };
        delete rest.organisedCrime;
        return rest;
      }
      return { ...c, organisedCrime: { memberships: next } };
    });
  };

  const rollEvent = () => {
    // App's existing d100 RNG idiom (cf. enterprise-utils.ts rollEnterpriseEvent,
    // RollCriticalFlow) — not a new RNG. The mapping is the pure
    // resolveCriminalEvent; display only, nothing is applied.
    const roll = Math.floor(Math.random() * 100) + 1;
    setLastEvent({ roll, row: resolveCriminalEvent(roll) });
  };

  // Highest level among memberships drives which reference rows are highlighted.
  const highlightLevel =
    memberships.length > 0
      ? Math.max(...memberships.map((m) => m.organisationLevel))
      : null;

  return (
    <div className={styles.sectionGap}>
      {/* ─── Memberships tracker ─────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={Users}
          title="Gang Memberships"
          action={<AddButton label="Add Gang" onClick={() => mutateMemberships(addMembership)} />}
        />
        <p className={styles.guidance}>
          {/* Deft Steps p.63 "Paying Your Dues" (docs/deftsteps.md L2343) */}
          Deft Steps p.63: a criminal pays 1 coin — set by their status tier — per
          Organisation Level of the gang, each month. Dues below are computed from
          this character&rsquo;s status (or a per-gang override). Nothing is applied
          automatically.
        </p>

        {memberships.length === 0 ? (
          <EmptyState
            icon={Users}
            heading="No gang memberships"
            description="Add a gang to track its Organisation Level, monthly dues, and the organisation perks you can call on."
            action={{ label: 'Add Gang', onClick: () => mutateMemberships(addMembership) }}
          />
        ) : (
          <div className={styles.membershipList}>
            {memberships.map((m) => {
              const resolvedStatus =
                m.statusOverride && m.statusOverride.trim().length > 0
                  ? m.statusOverride
                  : character.status;
              const dues = computeMonthlyDues(resolvedStatus, m.organisationLevel);
              const tooltipId = `dues-${m.id}`;
              return (
                <div key={m.id} className={styles.membershipCard}>
                  <div className={styles.membershipHeader}>
                    <input
                      className={styles.nameInput}
                      value={m.name}
                      maxLength={100}
                      placeholder="Gang name (e.g. Essen Black Rose Lodge)"
                      aria-label="Gang name"
                      onChange={(e) =>
                        mutateMemberships((list) => updateMembership(list, m.id, 'name', e.target.value))
                      }
                    />
                    <button
                      type="button"
                      className={styles.removeBtn}
                      title="Remove gang"
                      aria-label={`Remove ${m.name || 'gang'}`}
                      onClick={() => mutateMemberships((list) => removeMembership(list, m.id))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className={styles.fieldGrid}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor={`level-${m.id}`}>
                        Organisation Level
                      </label>
                      <select
                        id={`level-${m.id}`}
                        className={styles.selectField}
                        value={m.organisationLevel}
                        onChange={(e) =>
                          mutateMemberships((list) =>
                            updateMembership(list, m.id, 'organisationLevel', Number(e.target.value) as 1 | 2 | 3 | 4),
                          )
                        }
                      >
                        {ORG_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Level {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor={`status-${m.id}`}>
                        Status override (optional)
                      </label>
                      <input
                        id={`status-${m.id}`}
                        className={styles.inlineInput}
                        value={m.statusOverride ?? ''}
                        maxLength={50}
                        placeholder={character.status ? `Defaults to "${character.status}"` : 'e.g. Silver 2'}
                        aria-label="Status override"
                        onChange={(e) =>
                          mutateMemberships((list) =>
                            updateMembership(list, m.id, 'statusOverride', e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Monthly Dues</span>
                      {dues.tierUnknown ? (
                        <span className={styles.duesUnknown}>
                          <AlertTriangle size={12} aria-hidden="true" /> {dues.display}
                        </span>
                      ) : (
                        <TooltipTriggerCell
                          tooltipId={tooltipId}
                          className={styles.duesValue}
                          displayValue={dues.display}
                          ariaLabel={`Monthly dues: ${dues.display}. ${dues.breakdown
                            .map((b) => `${b.label}: ${b.value}`)
                            .join('; ')}. Show breakdown.`}
                          isTooltipOpen={openTooltip?.id === m.id}
                          onOpen={(anchorEl) => setOpenTooltip({ id: m.id, anchorEl })}
                          onClose={closeTooltip}
                        />
                      )}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor={`notes-${m.id}`}>
                      Notes
                    </label>
                    <textarea
                      id={`notes-${m.id}`}
                      className={styles.textarea}
                      value={m.notes ?? ''}
                      maxLength={1000}
                      placeholder="Role, favours owed, contacts…"
                      onChange={(e) =>
                        mutateMemberships((list) => updateMembership(list, m.id, 'notes', e.target.value))
                      }
                    />
                  </div>

                  {openTooltip?.id === m.id && !dues.tierUnknown && (
                    <Tooltip
                      id={tooltipId}
                      anchorEl={openTooltip.anchorEl}
                      title="Monthly Dues"
                      onClose={closeTooltip}
                    >
                      <div className={styles.tooltipBreakdown}>
                        {dues.breakdown.map((b, i) => (
                          <div
                            key={b.label}
                            className={i === dues.breakdown.length - 1 ? styles.tooltipTotal : styles.tooltipLine}
                          >
                            <span>{b.label}</span>
                            <span>{b.value}</span>
                          </div>
                        ))}
                      </div>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cross-reference to the existing gang-boss endeavours (guidance only;
            these live on the Endeavours tab — not duplicated here). */}
        <p className={styles.advisory}>
          Running a gang? The <strong>Build Gang</strong> and <strong>Organising Crime</strong>{' '}
          Endeavours are Challenging (+0) Leadership Tests; <strong>Maintain Influence</strong> is a
          Challenging (+0) Intimidate Test (Deft Steps p.58). Take them from the Endeavours tab.
        </p>
      </Card>

      {/* ─── Criminal Organisation table (reference) ─────────────────────── */}
      <Card>
        <SectionHeader icon={ShieldCheck} title="Criminal Organisation (Reference)" />
        <p className={styles.guidance}>
          {/* Deft Steps p.58 (docs/deftsteps.md L2208) */}
          Deft Steps p.58: cost to grow, muscle, resources, influence, and legal
          trouble by Organisation Level.
        </p>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow} ${styles.orgRow}`}>
            <span>Level</span>
            <span>Cost to Grow</span>
            <span>Muscle</span>
            <span>Resources</span>
            <span>Influence</span>
            <span>Legal Trouble</span>
          </div>
          {CRIMINAL_ORGANISATION.map((r) => (
            <div
              key={r.level}
              className={`${styles.row} ${styles.orgRow} ${r.level === highlightLevel ? styles.highlight : ''}`}
            >
              <span className={styles.cellPrimary}>{r.level}</span>
              <span>{r.costToGrow}</span>
              <span>{r.muscle}</span>
              <span>{r.resources}</span>
              <span>{r.influence}</span>
              <span>{r.legalTrouble}</span>
            </div>
          ))}
        </div>
        {highlightLevel !== null && (
          <p className={styles.caption}>
            Highlighted row = your highest tracked Organisation Level ({highlightLevel}).
          </p>
        )}
        <p className={styles.flagNote}>
          <AlertTriangle size={12} aria-hidden="true" /> {CRIMINAL_ORGANISATION_ARTIFACT_NOTE}
        </p>
      </Card>

      {/* ─── Perks by Organisation Level (reference) ─────────────────────── */}
      <Card>
        <SectionHeader icon={Gift} title="Perks by Organisation Level (Reference)" />
        <p className={styles.guidance}>
          {/* Deft Steps p.63 (docs/deftsteps.md ~L2481) */}
          Deft Steps p.63: the contacts, intelligence, fencing, and legal support
          a member can call on by Organisation Level.
        </p>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow} ${styles.perksRow}`}>
            <span>Level</span>
            <span>Facilitate Links to Contacts</span>
            <span>News and Rumours</span>
            <span>Will Help Fence</span>
            <span>{PERKS_LAWYERS_DISPLAY_HEADER}</span>
          </div>
          {PERKS_BY_LEVEL.map((r) => (
            <div
              key={r.level}
              className={`${styles.row} ${styles.perksRow} ${r.level === highlightLevel ? styles.highlight : ''}`}
            >
              <span className={styles.cellPrimary}>{r.level}</span>
              <span>{r.contacts}</span>
              <span>{r.news}</span>
              <span>{r.fence}</span>
              <span>{r.lawyers}</span>
            </div>
          ))}
        </div>
        <p className={styles.flagNote}>
          <AlertTriangle size={12} aria-hidden="true" /> {PERKS_ARTIFACT_NOTE}
        </p>
      </Card>

      {/* ─── Criminal Events table + roll helper (reference) ─────────────── */}
      <Card>
        <SectionHeader icon={Dices} title="Criminal Events (Reference)" />
        <p className={styles.guidance}>
          {/* Deft Steps p.60 (docs/deftsteps.md L2247) */}
          Deft Steps p.60: during each Downtime, after rolling for Events, roll a
          1d100 Criminal Event for the organisation. Reference only — nothing here
          auto-applies.
        </p>

        <div className={styles.rollerRow}>
          <button type="button" className={styles.primaryBtn} onClick={rollEvent}>
            <Dices size={14} /> Roll a Criminal Event (1d100)
          </button>
        </div>
        {lastEvent && (
          <div className={styles.rollerResult}>
            <div className={styles.rollerDice}>
              Rolled {lastEvent.roll} → {lastEvent.row.range}
            </div>
            <div className={styles.rollerOutcome}>
              <strong>{lastEvent.row.title}.</strong> {lastEvent.row.text}
            </div>
          </div>
        )}

        <div className={styles.eventRows}>
          {CRIMINAL_EVENTS.map((e) => (
            <div
              key={e.range}
              className={`${styles.eventRow} ${lastEvent?.row.range === e.range ? styles.highlight : ''}`}
            >
              <span className={styles.eventRoll}>{e.range}</span>
              <span className={styles.eventResult}>
                <strong>{e.title}.</strong> {e.text}
              </span>
            </div>
          ))}
        </div>
        <span className={styles.rollerCaption}>
          The 93-96 &ldquo;A Tempting Offer&rdquo; result is replaced by 97-00
          &ldquo;Regicide&rdquo; if the character declines the buy-out (Deft Steps p.60).
        </span>
      </Card>
    </div>
  );
}

export default OrganisedCrimePanel;
