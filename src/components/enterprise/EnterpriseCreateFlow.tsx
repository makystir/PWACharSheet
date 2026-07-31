import { useState } from 'react';
import type { EnterpriseType } from '../../types/character';
import { ENTERPRISE_TEMPLATES } from '../../data/enterprises';
import styles from './EnterpriseCreateFlow.module.css';

interface EnterpriseCreateFlowProps {
  onConfirm: (templateType: EnterpriseType, name: string) => void;
  onCancel: () => void;
}

export function EnterpriseCreateFlow({ onConfirm, onCancel }: EnterpriseCreateFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<EnterpriseType | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleTemplateSelect = (type: EnterpriseType) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setName('');
    setError('');
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enterprise name cannot be empty');
      return;
    }
    if (selectedType) {
      onConfirm(selectedType, trimmed);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-label="Create Enterprise">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {step === 1 && (
          <>
            <h3 className={styles.heading}>Select Enterprise Type</h3>
            <div className={styles.templateList}>
              {ENTERPRISE_TEMPLATES.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  className={styles.templateBtn}
                  onClick={() => handleTemplateSelect(template.type)}
                >
                  {template.displayName}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className={styles.heading}>Name Your Enterprise</h3>
            <input
              type="text"
              className={styles.nameInput}
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 100));
                setError('');
              }}
              placeholder="Enter enterprise name"
              maxLength={100}
              aria-label="Enterprise name"
              autoFocus
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className={styles.backBtn} onClick={handleBack}>
                Back
              </button>
              <button type="button" className={styles.confirmBtn} onClick={handleSubmit}>
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
