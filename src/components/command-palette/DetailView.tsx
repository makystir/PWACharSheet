import type { SearchResultEntry } from './searchIndex';
import type {
  SpellDisplayData,
  TalentDisplayData,
  SkillDisplayData,
  CareerDisplayData,
  RuneDisplayData,
  RitualDisplayData,
  ConditionDisplayData,
  CareerLevelSummary,
} from './searchIndex';
import styles from './DetailView.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

interface DetailViewProps {
  entity: SearchResultEntry;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Display "—" for missing/undefined/empty fields */
function display(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  const str = String(value).trim();
  return str.length === 0 ? '—' : str;
}

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{display(value)}</dd>
    </>
  );
}

// ─── Detail Panels ───────────────────────────────────────────────────────────

function SpellDetail({ data }: { data: SpellDisplayData }) {
  return (
    <dl className={styles.fieldList}>
      <Field label="CN" value={data.cn} />
      <Field label="Range" value={data.range} />
      <Field label="Target" value={data.target} />
      <Field label="Duration" value={data.duration} />
      <Field label="Effect" value={data.effect} />
      <Field label="Lore" value={data.lore} />
    </dl>
  );
}

function TalentDetail({ data }: { data: TalentDisplayData }) {
  return (
    <dl className={styles.fieldList}>
      <Field label="Max" value={data.max} />
      <Field label="Description" value={data.desc} />
    </dl>
  );
}

function SkillDetail({ data }: { data: SkillDisplayData }) {
  return (
    <dl className={styles.fieldList}>
      <Field label="Characteristic" value={data.characteristic} />
    </dl>
  );
}

function CareerDetail({ data }: { data: CareerDisplayData }) {
  return (
    <div>
      <dl className={styles.fieldList}>
        <Field label="Class" value={data.class} />
      </dl>
      <div className={styles.levelsContainer}>
        {data.levels.map((level: CareerLevelSummary, i: number) => (
          <div key={i} className={styles.levelSection}>
            <h4 className={styles.levelTitle}>{display(level.title)}</h4>
            <dl className={styles.levelFields}>
              <Field label="Status" value={level.status} />
              <Field label="Characteristics" value={level.characteristics.length > 0 ? level.characteristics.join(', ') : undefined} />
              <Field label="Skills" value={level.skills.length > 0 ? level.skills.join(', ') : undefined} />
              <Field label="Talents" value={level.talents.length > 0 ? level.talents.join(', ') : undefined} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuneDetail({ data }: { data: RuneDisplayData }) {
  return (
    <dl className={styles.fieldList}>
      <Field label="Category" value={data.category} />
      <Field label="Master Rune" value={data.isMaster ? 'Yes' : 'No'} />
      <Field label="Max Per Item" value={data.maxPerItem} />
      <Field label="XP Cost" value={data.xpCost} />
      <Field label="Effects" value={data.effects} />
      <Field label="Description" value={data.description} />
    </dl>
  );
}

function RitualDetail({ data }: { data: RitualDisplayData }) {
  return (
    <dl className={styles.fieldList}>
      <Field label="CN" value={data.cn} />
      <Field label="Type" value={data.ritualType} />
      <Field label="Learning XP" value={data.learningXP} />
      <Field label="Ingredients" value={data.ingredients} />
      <Field label="Conditions" value={data.conditions} />
      <Field label="Description" value={data.description} />
    </dl>
  );
}

function ConditionDetail({ data }: { data: ConditionDisplayData }) {
  return (
    <dl className={styles.fieldList}>
      <Field label="Stackable" value={data.stackable ? 'Yes' : 'No'} />
      <Field label="Description" value={data.description} />
      <Field label="Effects" value={data.effects} />
      <Field label="Duration" value={data.duration} />
      <Field label="Removed By" value={data.removedBy} />
    </dl>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DetailView({ entity, onBack }: DetailViewProps) {
  const { displayData } = entity.entity;

  function renderDetail() {
    switch (displayData.type) {
      case 'spell':
        return <SpellDetail data={displayData} />;
      case 'talent':
        return <TalentDetail data={displayData} />;
      case 'skill':
        return <SkillDetail data={displayData} />;
      case 'career':
        return <CareerDetail data={displayData} />;
      case 'rune':
        return <RuneDetail data={displayData} />;
      case 'ritual':
        return <RitualDetail data={displayData} />;
      case 'condition':
        return <ConditionDetail data={displayData} />;
      default:
        return null;
    }
  }

  return (
    <div data-testid="command-palette-detail" className={styles.container}>
      <button
        className={styles.backButton}
        onClick={onBack}
        type="button"
        aria-label="Back to results"
      >
        ← Back
      </button>
      <h2 className={styles.heading}>{entity.entity.name}</h2>
      {renderDetail()}
    </div>
  );
}
