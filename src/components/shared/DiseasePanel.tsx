import { useState } from 'react';
import type { Character } from '../../types/character';
import type { DiseaseEntry } from '../../data/diseases';
import { DISEASE_REGISTRY } from '../../data/diseases';
import { addDisease, removeDisease, updateDiseaseNotes, findDisease, getDiseaseSymptoms } from '../../logic/diseases';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { AddButton } from './AddButton';
import { Picker } from './Picker';
import { HeartPulse, ChevronDown, ChevronRight } from 'lucide-react';
import styles from './DiseasePanel.module.css';

interface DiseasePanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

export function DiseasePanel({ character, updateCharacter }: DiseasePanelProps) {
  const diseases = character.diseases ?? [];
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSelectDisease = (entry: DiseaseEntry) => {
    updateCharacter((char) => ({
      ...char,
      diseases: addDisease(char.diseases ?? [], entry.name),
    }));
    setShowPicker(false);
  };

  const handleRemoveDisease = (id: number) => {
    updateCharacter((char) => ({
      ...char,
      diseases: removeDisease(char.diseases ?? [], id),
    }));
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const handleNotesChange = (id: number, notes: string) => {
    updateCharacter((char) => ({
      ...char,
      diseases: updateDiseaseNotes(char.diseases ?? [], id, notes),
    }));
  };

  function toggleExpand(id: number) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <Card>
      <SectionHeader icon={HeartPulse} title="Diseases" />

      {diseases.length === 0 ? (
        <div className={styles.emptyState}>No active diseases</div>
      ) : (
        <div className={styles.diseaseList}>
          {diseases.map((disease) => {
            const isExpanded = expandedId === disease.id;
            const diseaseEntry = isExpanded ? findDisease(disease.diseaseName) : null;
            const symptoms = isExpanded ? getDiseaseSymptoms(disease.diseaseName) : null;

            return (
              <div key={disease.id} className={styles.diseaseItem}>
                <div className={styles.diseaseHeaderRow}>
                  <button
                    type="button"
                    className={styles.diseaseHeader}
                    onClick={() => toggleExpand(disease.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle ${disease.diseaseName} details`}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={14} className={styles.chevron} aria-hidden="true" />
                    )}
                    <span className={styles.diseaseName}>{disease.diseaseName}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemoveDisease(disease.id)}
                    aria-label={`Remove ${disease.diseaseName}`}
                  >
                    ✕
                  </button>
                </div>

                {isExpanded && diseaseEntry && (
                  <div className={styles.diseaseDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Contraction:</span>
                      <span className={styles.detailValue}>{diseaseEntry.contraction}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Incubation:</span>
                      <span className={styles.detailValue}>{diseaseEntry.incubation}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Duration:</span>
                      <span className={styles.detailValue}>{diseaseEntry.duration}</span>
                    </div>

                    {symptoms && symptoms.length > 0 && (
                      <div className={styles.symptomsList}>
                        <span className={styles.symptomsHeading}>Symptoms</span>
                        {symptoms.map((symptom) => (
                          <div key={symptom.name} className={styles.symptomItem}>
                            <span className={styles.symptomName}>{symptom.name}</span>
                            <span className={styles.symptomDescription}>{symptom.description}</span>
                            <span className={styles.symptomEffects}>{symptom.effects}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.notesSection}>
                      <label className={styles.notesLabel} htmlFor={`disease-notes-${disease.id}`}>Notes</label>
                      <textarea
                        id={`disease-notes-${disease.id}`}
                        className={styles.notesTextarea}
                        value={disease.notes}
                        onBlur={(e) => handleNotesChange(disease.id, e.target.value)}
                        onChange={(e) => handleNotesChange(disease.id, e.target.value)}
                        placeholder="Add notes (GM rulings, duration, treatment...)"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.addRow}>
        <AddButton label="Add Disease" onClick={() => setShowPicker(true)} />
      </div>

      {showPicker && (
        <Picker
          items={[...DISEASE_REGISTRY]}
          getLabel={(entry) => entry.name}
          onSelect={handleSelectDisease}
          onClose={() => setShowPicker(false)}
          title="Add Disease"
        />
      )}
    </Card>
  );
}
