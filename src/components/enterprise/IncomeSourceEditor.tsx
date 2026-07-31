import type { EnterpriseIncomeSource } from '../../types/character';
import styles from './IncomeSourceEditor.module.css';

interface IncomeSourceEditorProps {
  incomeSources: EnterpriseIncomeSource[];
  onChange: (updated: EnterpriseIncomeSource[]) => void;
}

const MAX_INCOME_SOURCES = 20;

export function IncomeSourceEditor({ incomeSources, onChange }: IncomeSourceEditorProps) {
  const atLimit = incomeSources.length >= MAX_INCOME_SOURCES;

  function handleFieldBlur(id: string, field: keyof Omit<EnterpriseIncomeSource, 'id'>, value: string) {
    const updated = incomeSources.map((source) =>
      source.id === id ? { ...source, [field]: value } : source
    );
    onChange(updated);
  }

  function handleAdd() {
    if (atLimit) return;
    const newSource: EnterpriseIncomeSource = {
      id: crypto.randomUUID(),
      description: '',
      earningSkill: '',
      effectiveStatus: '',
    };
    onChange([...incomeSources, newSource]);
  }

  function handleRemove(id: string) {
    onChange(incomeSources.filter((source) => source.id !== id));
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>Income Sources</span>
      <div className={styles.list}>
        {incomeSources.map((source) => (
          <div key={source.id} className={styles.row}>
            <input
              className={`${styles.field} ${styles.fieldDescription}`}
              type="text"
              maxLength={200}
              placeholder="Description"
              defaultValue={source.description}
              onBlur={(e) => handleFieldBlur(source.id, 'description', e.target.value)}
              aria-label="Description"
            />
            <input
              className={`${styles.field} ${styles.fieldSkill}`}
              type="text"
              maxLength={100}
              placeholder="Earning Skill"
              defaultValue={source.earningSkill}
              onBlur={(e) => handleFieldBlur(source.id, 'earningSkill', e.target.value)}
              aria-label="Earning Skill"
            />
            <input
              className={`${styles.field} ${styles.fieldStatus}`}
              type="text"
              maxLength={50}
              placeholder="Status"
              defaultValue={source.effectiveStatus}
              onBlur={(e) => handleFieldBlur(source.id, 'effectiveStatus', e.target.value)}
              aria-label="Effective Status"
            />
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => handleRemove(source.id)}
              aria-label={`Remove income source: ${source.description || 'unnamed'}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.addBtn}
        onClick={handleAdd}
        disabled={atLimit}
        title={atLimit ? 'Maximum of 20 income sources reached' : undefined}
      >
        + Add Income Source
      </button>
    </div>
  );
}
