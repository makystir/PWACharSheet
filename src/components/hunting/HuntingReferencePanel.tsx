import { Crosshair, Coins, Dog, Bird, Compass, Home, AlertTriangle } from 'lucide-react';
import type { Character } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import {
  HUNTING_CONSIDERATIONS,
  A_FAST_BUCK,
  A_FAST_BUCK_FOOTNOTE,
  A_FAST_BUCK_ARTIFACT_NOTE,
  ANIMALS_AND_EQUIPMENT,
  HUNTERS_GARB_EFFECT,
  HOUND_TRAINING,
  HOUND_TRAITS,
  HOUND_ASSISTANCE,
  HAWK_TRAINING,
  HAWK_TRAITS,
  HAWK_ASSISTANCE_TRUNCATION_NOTE,
  HUNTING_AS_ENDEAVOUR,
  HUNTING_LODGES_OVERVIEW,
  TYPICAL_HUNTING_LODGE,
  type HuntingAnimalTraining,
  type HuntingTrait,
} from '../../logic/hunting';
import styles from './HuntingReferencePanel.module.css';

/**
 * Read-only Hunting reference surface (Deft Steps, "Hunter and Hunted").
 * Gated by houseRules.useHunting upstream (EndeavoursPage); this panel only
 * mounts when the rule is on. It renders purely from the frozen hunting-data
 * constants — no character mutation, no computed value, no seeded rolls
 * (Decision 4). The `character` prop is read only for the optional
 * Wilderness-Travel cross-link caption.
 */
interface HuntingReferencePanelProps {
  character: Character;
}

/** Render a training difficulty as the book prints it (e.g. "Hard (-20)"). */
function formatDifficulty(label: string, modifier: number): string {
  const sign = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  return `${label} (${sign})`;
}

function TraitList({
  training,
  traits,
}: {
  training: HuntingAnimalTraining;
  traits: readonly HuntingTrait[];
}) {
  return (
    <>
      <p className={styles.guidance}>
        First trait must be <strong>{training.firstTrait}</strong>. Granting a
        Hunting Trait takes {training.hours} hour{training.hours === 1 ? '' : 's'} and a{' '}
        <strong>{formatDifficulty(training.test.label, training.test.modifier)} Animal Training Test</strong>;
        on a fail, rest the animal a day then retry.
      </p>
      <div className={styles.traitList}>
        {traits.map((trait) => (
          <div key={trait.name} className={styles.traitRow}>
            <div className={styles.traitHead}>
              <span className={styles.traitName}>{trait.name}</span>
              <span className={styles.traitTest}>
                {trait.trainingTest
                  ? formatDifficulty(trait.trainingTest.label, trait.trainingTest.modifier)
                  : 'no test'}
              </span>
            </div>
            <p className={styles.traitDesc}>{trait.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function HuntingReferencePanel({ character }: HuntingReferencePanelProps) {
  const crossLinkTerrain = character.houseRules.useWildernessTravel === true;

  return (
    <div className={styles.sectionGap}>
      {/* ─── Hunting as Endeavour (guidance only) ─────────────────────────── */}
      <Card>
        <SectionHeader icon={Compass} title="Hunting as Endeavour (Reference)" />
        {/* Deft Steps p.124–125: cross-reference guidance only; not merged into endeavours. */}
        <p className={styles.guidance}>{HUNTING_AS_ENDEAVOUR.travel}</p>
        <p className={styles.guidance}>{HUNTING_AS_ENDEAVOUR.downtime}</p>
        <p className={styles.advisory}>
          These are cross-reference notes only — nothing is applied automatically.
        </p>
      </Card>

      {/* ─── Hunting Considerations ───────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Crosshair} title="Hunting Considerations" />
        <p className={styles.guidance}>
          {/* Deft Steps p.124 */}
          Deft Steps p.124: terrain and Outdoor Survival Test difficulty for hunting
          particular game as part of a Hunting Endeavour.
        </p>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow} ${styles.considerationsRow}`}>
            <span>Game</span>
            <span>Terrain</span>
            <span>Test Difficulty</span>
          </div>
          {HUNTING_CONSIDERATIONS.map((row) => (
            <div key={row.game} className={`${styles.row} ${styles.considerationsRow}`}>
              <span className={styles.cellPrimary}>{row.game}</span>
              <span>{row.terrain.join(', ')}</span>
              <span>{formatDifficulty(row.difficultyLabel, row.difficultyModifier)}</span>
            </div>
          ))}
        </div>
        {crossLinkTerrain && (
          <p className={styles.caption}>
            With Wilderness Travel on, these terrain names correspond to the Journey
            terrain types ("Deep Forest" → Deep forest, "Wetlands" → Wetland, "Any" →
            all six).
          </p>
        )}
      </Card>

      {/* ─── A Fast Buck — value table ────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Coins} title="A Fast Buck — The Value Of" />
        <p className={styles.guidance}>
          {/* Deft Steps p.131 */}
          Deft Steps p.131: a rough guide to the prices parts of animals can fetch.
          Prices are for a corpse in fair condition and vary with season and suspicion
          of illicit goods.
        </p>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow} ${styles.fastBuckRow}`}>
            <span>Item</span>
            <span>Days of Food</span>
            <span>Other uses</span>
            <span>Price</span>
          </div>
          {A_FAST_BUCK.map((row) => (
            <div key={row.item} className={`${styles.row} ${styles.fastBuckRow}`}>
              <span className={styles.cellPrimary}>{row.item}</span>
              <span>{row.daysOfFood}</span>
              <span>{row.otherUses}</span>
              <span>{row.price}</span>
            </div>
          ))}
        </div>
        <p className={styles.footnote}>{A_FAST_BUCK_FOOTNOTE}</p>
        <p className={styles.flagNote}>
          <AlertTriangle size={12} aria-hidden="true" /> {A_FAST_BUCK_ARTIFACT_NOTE}
        </p>
      </Card>

      {/* ─── Animals and Equipment ────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Dog} title="Animals and Equipment" />
        <p className={styles.guidance}>
          {/* Deft Steps p.132 */}
          Deft Steps p.132. Full creature statblocks for the hunting animals live in
          the source book and are not transcribed here.
        </p>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.headRow} ${styles.equipmentRow}`}>
            <span>Item</span>
            <span>Cost</span>
            <span>Enc</span>
            <span>Availability</span>
          </div>
          {ANIMALS_AND_EQUIPMENT.map((row) => (
            <div key={row.item} className={`${styles.row} ${styles.equipmentRow}`}>
              <span className={styles.cellPrimary}>{row.item}</span>
              <span>{row.cost}</span>
              <span>{row.enc}</span>
              <span>{row.availability}</span>
            </div>
          ))}
        </div>
        <p className={styles.guidance}>
          {/* Deft Steps p.132: Hunter's Garb */}
          <strong>Hunter&rsquo;s Garb.</strong> {HUNTERS_GARB_EFFECT}
        </p>
      </Card>

      {/* ─── Hounds — traits & training ───────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Dog} title="Hunting Hounds — Traits & Training" />
        <TraitList training={HOUND_TRAINING} traits={HOUND_TRAITS} />
        <p className={styles.advisory}>{HOUND_ASSISTANCE}</p>
      </Card>

      {/* ─── Hawks — traits & training ────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Bird} title="Hunting Hawks — Traits & Training" />
        <TraitList training={HAWK_TRAINING} traits={HAWK_TRAITS} />
        <p className={styles.flagNote}>
          <AlertTriangle size={12} aria-hidden="true" /> {HAWK_ASSISTANCE_TRUNCATION_NOTE}
        </p>
      </Card>

      {/* ─── Hunting Lodges — descriptive reference only ──────────────────── */}
      <Card>
        <SectionHeader icon={Home} title="Hunting Lodges (Reference)" />
        <p className={styles.guidance}>
          {/* Deft Steps p.136–137: descriptive only, no ownership/upkeep mechanic. */}
          {HUNTING_LODGES_OVERVIEW}
        </p>
        <h4 className={styles.subHeading}>A Typical Hunting Lodge</h4>
        <div className={styles.lodgeList}>
          {TYPICAL_HUNTING_LODGE.map((floor) => (
            <div key={floor.name} className={styles.lodgeFloor}>
              <span className={styles.lodgeFloorName}>{floor.name}</span>
              <p className={styles.lodgeFloorDesc}>{floor.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default HuntingReferencePanel;
