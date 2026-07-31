import { useState } from 'react';
import type { Character, EnterpriseType } from '../../types/character';
import { createEnterpriseFromTemplate } from '../../logic/enterprise-utils';
import { EnterpriseSummaryCard } from './EnterpriseSummaryCard';
import { EnterpriseDetailView } from './EnterpriseDetailView';
import { EnterpriseCreateFlow } from './EnterpriseCreateFlow';
import styles from './EnterpriseList.module.css';

interface EnterpriseListProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

export function EnterpriseList({ character, updateCharacter }: EnterpriseListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  const enterprises = character.enterprises ?? [];

  // Detail view for a selected enterprise
  if (selectedIndex !== null && enterprises[selectedIndex]) {
    return (
      <EnterpriseDetailView
        enterprise={enterprises[selectedIndex]}
        enterpriseIndex={selectedIndex}
        updateCharacter={updateCharacter}
        onBack={() => setSelectedIndex(null)}
      />
    );
  }

  // Create flow overlay
  const handleCreateConfirm = (templateType: EnterpriseType, name: string) => {
    const newEnterprise = createEnterpriseFromTemplate(templateType, name);
    updateCharacter((char) => ({
      ...char,
      enterprises: [...(char.enterprises ?? []), newEnterprise],
    }));
    setShowCreateFlow(false);
  };

  // Empty state
  if (enterprises.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>No enterprises yet</span>
          <button
            type="button"
            className={styles.emptyCreateBtn}
            onClick={() => setShowCreateFlow(true)}
          >
            Create Enterprise
          </button>
        </div>
        {showCreateFlow && (
          <EnterpriseCreateFlow
            onConfirm={handleCreateConfirm}
            onCancel={() => setShowCreateFlow(false)}
          />
        )}
      </div>
    );
  }

  // Summary list view
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Enterprises</span>
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => setShowCreateFlow(true)}
        >
          Create Enterprise
        </button>
      </div>
      <div className={styles.list}>
        {enterprises.map((enterprise, index) => (
          <EnterpriseSummaryCard
            key={enterprise.id}
            enterprise={enterprise}
            onClick={() => setSelectedIndex(index)}
          />
        ))}
      </div>
      {showCreateFlow && (
        <EnterpriseCreateFlow
          onConfirm={handleCreateConfirm}
          onCancel={() => setShowCreateFlow(false)}
        />
      )}
    </div>
  );
}
