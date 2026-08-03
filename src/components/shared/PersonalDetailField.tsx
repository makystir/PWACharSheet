import { EditableField } from './EditableField';
import styles from './PersonalDetailField.module.css';

interface PersonalDetailFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  onRoll: () => void;
  dropdownOptions?: string[];
  onDropdownSelect?: (value: string) => void;
  disabled?: boolean;
}

export function PersonalDetailField({
  label,
  value,
  onSave,
  onRoll,
  dropdownOptions,
  onDropdownSelect,
  disabled = false,
}: PersonalDetailFieldProps) {
  const handleRollClick = () => {
    if (!disabled) {
      onRoll();
    }
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (!disabled && selected && onDropdownSelect) {
      onDropdownSelect(selected);
    }
    // Reset select to default empty option after selection
    e.target.value = '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.field}>
        <EditableField
          label={label}
          value={value}
          onSave={(v) => onSave(String(v))}
          type="text"
          mode="tap-to-edit"
        />
      </div>

      <button
        type="button"
        className={`${styles.rollButton}${disabled ? ` ${styles.disabled}` : ''}`}
        onClick={handleRollClick}
        aria-disabled={disabled ? 'true' : undefined}
        aria-label={`Roll ${label}`}
      >
        🎲
      </button>

      {dropdownOptions && dropdownOptions.length > 0 && (
        <select
          className={`${styles.dropdown}${disabled ? ` ${styles.disabled}` : ''}`}
          onChange={handleDropdownChange}
          aria-disabled={disabled ? 'true' : undefined}
          aria-label={`Select ${label}`}
          defaultValue=""
        >
          <option value="" disabled>
            Select…
          </option>
          {dropdownOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
