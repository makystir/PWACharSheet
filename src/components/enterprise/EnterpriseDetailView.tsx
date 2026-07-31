import { useState } from 'react';
import type { Character, Enterprise } from '../../types/character';
import { parseMonetaryInput, clampMonetary } from '../../logic/enterprise-utils';
import styles from './EnterpriseDetailView.module.css';

interface EnterpriseDetailViewProps {
  enterprise: Enterprise;
  enterpriseIndex: number;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  onBack: () => void;
}

function updateEnterprise(
  updateCharacter: (mutator: (char: Character) => Character) => void,
  enterpriseIndex: number,
  updater: (enterprise: Enterprise) => Enterprise
) {
  updateCharacter((char) => {
    const enterprises = [...(char.enterprises ?? [])];
    enterprises[enterpriseIndex] = updater(enterprises[enterpriseIndex]);
    return { ...char, enterprises };
  });
}

export function EnterpriseDetailView({
  enterprise,
  enterpriseIndex,
  updateCharacter,
  onBack,
}: EnterpriseDetailViewProps) {
  const [name, setName] = useState(enterprise.name);
  const [creditorName, setCreditorName] = useState(enterprise.creditorName);
  const [debtGc, setDebtGc] = useState(String(enterprise.debt.gc));
  const [debtSs, setDebtSs] = useState(String(enterprise.debt.ss));
  const [debtD, setDebtD] = useState(String(enterprise.debt.d));
  const [interestGc, setInterestGc] = useState(String(enterprise.interestPayment.gc));
  const [interestSs, setInterestSs] = useState(String(enterprise.interestPayment.ss));
  const [interestD, setInterestD] = useState(String(enterprise.interestPayment.d));
  const [notes, setNotes] = useState(enterprise.notes);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const commitName = () => {
    const trimmed = name.slice(0, 100);
    // If empty after trim, revert to the current persisted name
    if (trimmed.trim().length === 0) {
      setName(enterprise.name);
      return;
    }
    setName(trimmed);
    updateEnterprise(updateCharacter, enterpriseIndex, (ent) => ({
      ...ent,
      name: trimmed,
    }));
  };

  const commitCreditorName = () => {
    const truncated = creditorName.slice(0, 100);
    setCreditorName(truncated);
    updateEnterprise(updateCharacter, enterpriseIndex, (ent) => ({
      ...ent,
      creditorName: truncated,
    }));
  };

  const commitDebt = () => {
    const gc = clampMonetary(parseMonetaryInput(debtGc));
    const ss = clampMonetary(parseMonetaryInput(debtSs));
    const d = clampMonetary(parseMonetaryInput(debtD));
    setDebtGc(String(gc));
    setDebtSs(String(ss));
    setDebtD(String(d));
    updateEnterprise(updateCharacter, enterpriseIndex, (ent) => ({
      ...ent,
      debt: { gc, ss, d },
    }));
  };

  const commitInterest = () => {
    const gc = clampMonetary(parseMonetaryInput(interestGc));
    const ss = clampMonetary(parseMonetaryInput(interestSs));
    const d = clampMonetary(parseMonetaryInput(interestD));
    setInterestGc(String(gc));
    setInterestSs(String(ss));
    setInterestD(String(d));
    updateEnterprise(updateCharacter, enterpriseIndex, (ent) => ({
      ...ent,
      interestPayment: { gc, ss, d },
    }));
  };

  const commitNotes = () => {
    const truncated = notes.slice(0, 2000);
    setNotes(truncated);
    updateEnterprise(updateCharacter, enterpriseIndex, (ent) => ({
      ...ent,
      notes: truncated,
    }));
  };

  const handleKeyDown = (commitFn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
      commitFn();
    }
  };

  const handleDeleteConfirm = () => {
    updateCharacter((char) => ({
      ...char,
      enterprises: (char.enterprises ?? []).filter((e) => e.id !== enterprise.id),
    }));
    onBack();
  };

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>

      <div className={styles.header}>
        <span className={styles.typeBadge}>{enterprise.type}</span>
        <span className={styles.levelBadge}>Level {enterprise.expansionLevel}</span>
      </div>

      <div className={styles.fieldGroup}>
        {/* Name */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Name</label>
          <input
            type="text"
            className={styles.textInput}
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleKeyDown(commitName)}
          />
        </div>

        {/* Creditor Name */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Creditor Name</label>
          <input
            type="text"
            className={styles.textInput}
            value={creditorName}
            maxLength={100}
            onChange={(e) => setCreditorName(e.target.value)}
            onBlur={commitCreditorName}
            onKeyDown={handleKeyDown(commitCreditorName)}
          />
        </div>

        {/* Debt */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Debt</label>
          <div className={styles.currencyRow}>
            <div className={styles.currencyField}>
              <input
                type="text"
                className={styles.currencyInput}
                value={debtGc}
                onChange={(e) => setDebtGc(e.target.value)}
                onBlur={commitDebt}
                onKeyDown={handleKeyDown(commitDebt)}
                aria-label="Debt gold crowns"
              />
              <span className={styles.currencyLabel}>GC</span>
            </div>
            <div className={styles.currencyField}>
              <input
                type="text"
                className={styles.currencyInput}
                value={debtSs}
                onChange={(e) => setDebtSs(e.target.value)}
                onBlur={commitDebt}
                onKeyDown={handleKeyDown(commitDebt)}
                aria-label="Debt silver shillings"
              />
              <span className={styles.currencyLabel}>SS</span>
            </div>
            <div className={styles.currencyField}>
              <input
                type="text"
                className={styles.currencyInput}
                value={debtD}
                onChange={(e) => setDebtD(e.target.value)}
                onBlur={commitDebt}
                onKeyDown={handleKeyDown(commitDebt)}
                aria-label="Debt brass pennies"
              />
              <span className={styles.currencyLabel}>D</span>
            </div>
          </div>
        </div>

        {/* Interest Payment */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Interest Payment</label>
          <div className={styles.currencyRow}>
            <div className={styles.currencyField}>
              <input
                type="text"
                className={styles.currencyInput}
                value={interestGc}
                onChange={(e) => setInterestGc(e.target.value)}
                onBlur={commitInterest}
                onKeyDown={handleKeyDown(commitInterest)}
                aria-label="Interest gold crowns"
              />
              <span className={styles.currencyLabel}>GC</span>
            </div>
            <div className={styles.currencyField}>
              <input
                type="text"
                className={styles.currencyInput}
                value={interestSs}
                onChange={(e) => setInterestSs(e.target.value)}
                onBlur={commitInterest}
                onKeyDown={handleKeyDown(commitInterest)}
                aria-label="Interest silver shillings"
              />
              <span className={styles.currencyLabel}>SS</span>
            </div>
            <div className={styles.currencyField}>
              <input
                type="text"
                className={styles.currencyInput}
                value={interestD}
                onChange={(e) => setInterestD(e.target.value)}
                onBlur={commitInterest}
                onKeyDown={handleKeyDown(commitInterest)}
                aria-label="Interest brass pennies"
              />
              <span className={styles.currencyLabel}>D</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Notes</label>
          <textarea
            className={styles.textarea}
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={commitNotes}
          />
        </div>
      </div>

      {/* Placeholders for future task components */}
      <div className={styles.placeholder}>Income Sources editor — coming soon</div>
      <div className={styles.placeholder}>Trappings editor — coming soon</div>
      <div className={styles.placeholder}>Special Rules editor — coming soon</div>
      <div className={styles.placeholder}>Expansion Panel — coming soon</div>
      <div className={styles.placeholder}>Event Roller — coming soon</div>

      {/* Delete Enterprise */}
      {!showDeleteConfirm ? (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete Enterprise
        </button>
      ) : (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteWarning}>
            Are you sure you want to delete &lsquo;{enterprise.name}&rsquo;?
          </p>
          <div className={styles.deleteActions}>
            <button
              type="button"
              className={styles.confirmDeleteBtn}
              onClick={handleDeleteConfirm}
            >
              Confirm Delete
            </button>
            <button
              type="button"
              className={styles.cancelDeleteBtn}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
