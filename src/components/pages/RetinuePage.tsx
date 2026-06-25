import { useState, useEffect } from 'react';
import type { Character, Hireling } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Picker } from '../shared/Picker';
import { Toast } from '../shared/Toast';
import { HirelingCreationFlow } from '../retinue/HirelingCreationFlow';
import { HirelingCard } from '../retinue/HirelingCard';
import { useUndoToast } from '../../hooks/useUndoToast';
import { removeAtIndex, restoreAtIndex } from '../../logic/undo';
import { ANIMAL_TEMPLATES, TRAINED_SKILLS } from '../../data/animals';
import { Users, Plus, PawPrint } from 'lucide-react';
import { SubTabBar } from '../shared/SubTabBar';
import { EmptyState } from '../shared/EmptyState';
import styles from './RetinuePage.module.css';

interface RetinuePageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  subTab?: string | null;
  onSubTabChange?: (tab: string) => void;
}

type RetinueSubTab = 'hirelings' | 'companions';

export function RetinuePage({ character, update, updateCharacter, subTab, onSubTabChange }: RetinuePageProps) {
  const VALID_SUBTABS: RetinueSubTab[] = ['hirelings', 'companions'];
  const initialTab = (subTab && VALID_SUBTABS.includes(subTab as RetinueSubTab)) ? subTab as RetinueSubTab : 'hirelings';
  const [activeSubTab, setActiveSubTabInternal] = useState<RetinueSubTab>(initialTab);

  // Sync from external subTab prop (e.g. URL hash changes)
  useEffect(() => {
    if (subTab && VALID_SUBTABS.includes(subTab as RetinueSubTab)) {
      setActiveSubTabInternal(subTab as RetinueSubTab);
    }
  }, [subTab]);

  // Wrapper that notifies parent when sub-tab changes
  const setActiveSubTab = (tab: RetinueSubTab) => {
    setActiveSubTabInternal(tab);
    onSubTabChange?.(tab);
  };

  const [showCreationFlow, setShowCreationFlow] = useState(false);
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);
  const undoToast = useUndoToast();

  const hirelings = character.hirelings || [];
  const atMax = hirelings.length >= 10;

  function handleAddHireling(hireling: Hireling) {
    if (atMax) return; // Enforce max 10 hirelings
    updateCharacter((char) => ({
      ...char,
      hirelings: [...(char.hirelings || []), hireling],
    }));
    setShowCreationFlow(false);
  }

  const handleHirelingUpdate = (id: number, field: string, value: unknown) => {
    updateCharacter((c) => ({
      ...c,
      hirelings: (c.hirelings || []).map((h) =>
        h.id === id ? { ...h, [field]: value } : h
      ),
    }));
  };

  const handleHirelingDelete = (id: number) => {
    const hirelingList = character.hirelings || [];
    const index = hirelingList.findIndex((h) => h.id === id);
    if (index === -1) return;
    const hireling = hirelingList[index];
    updateCharacter((c) => ({
      ...c,
      hirelings: removeAtIndex(c.hirelings || [], index),
    }));
    undoToast.show('Hireling removed', hireling, index, (item, idx) => {
      updateCharacter((c) => ({
        ...c,
        hirelings: restoreAtIndex(c.hirelings || [], item as Hireling, idx),
      }));
    });
  };

  const handleDeleteCompanion = (ci: number) => {
    const companion = character.companions[ci];
    updateCharacter((c) => ({ ...c, companions: removeAtIndex(c.companions, ci) }));
    undoToast.show('Companion removed', companion, ci, (item, idx) => {
      updateCharacter((c) => ({ ...c, companions: restoreAtIndex(c.companions, item as typeof companion, idx) }));
    });
  };

  return (
    <div className={styles.sectionGap}>
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={[
          { id: 'hirelings', label: 'Hirelings' },
          { id: 'companions', label: 'Animal Companions' },
        ]}
        activeTab={activeSubTab}
        onTabChange={(tab) => setActiveSubTab(tab as RetinueSubTab)}
      />

      {activeSubTab === 'hirelings' && (
        <>
          <Card>
            <SectionHeader
              icon={Users}
              title="Hirelings"
              action={
                <button
                  type="button"
                  className={styles.addHirelingBtn}
                  disabled={atMax}
                  onClick={() => setShowCreationFlow(true)}
                >
                  <Plus size={14} />
                  Add Hireling
                </button>
              }
            />

            {hirelings.length === 0 && (
              <EmptyState
                icon={Users}
                heading="No hirelings yet"
                description="Hire followers from the Up in Arms profiles or create custom NPCs."
              />
            )}

            {hirelings.length > 0 && (
              <div className={styles.hirelingList}>
                {hirelings.map((h) => (
                  <HirelingCard
                    key={h.id}
                    hireling={h}
                    onUpdate={handleHirelingUpdate}
                    onDelete={handleHirelingDelete}
                  />
                ))}
              </div>
            )}
          </Card>

          {showCreationFlow && (
            <HirelingCreationFlow
              onConfirm={handleAddHireling}
              onCancel={() => setShowCreationFlow(false)}
            />
          )}
        </>
      )}

      {activeSubTab === 'companions' && (
        <>
          <Card>
            <SectionHeader icon={PawPrint} title="Animal Companions" action={
              <div className={styles.actionRow}>
                <AddButton label="Add from Templates" onClick={() => setShowAnimalPicker(true)} />
                <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, companions: [...c.companions, { name: '', species: '', M: 0, WS: 0, BS: 0, S: 0, T: 0, I: 0, Ag: 0, Dex: 0, Int: 0, WP: 0, Fel: 0, W: 1, wCur: 1, traits: '', trained: [], notes: '' }] }))} />
              </div>
            } />

            {character.companions.length === 0 && (
              <EmptyState
                icon={PawPrint}
                heading="No animal companions yet"
                description="Add one from the templates or create a custom companion."
              />
            )}

            {character.companions.map((comp, ci) => {
              const uc = (field: string, val: unknown) => update(`companions.${ci}.${field}`, val);
              const charKeys = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'] as const;
              return (
                <div key={ci} className={comp.isPackAnimal ? styles.companionCardPack : styles.companionCard}>
                  <div className={styles.companionHeader}>
                    <div className={styles.companionHeaderLeft}>
                      <EditableField label="Name" value={comp.name} onSave={(v) => uc('name', v)} />
                      <EditableField label="Species" value={comp.species} onSave={(v) => uc('species', v)} />
                      <label className={comp.isPackAnimal ? styles.packAnimalLabelActive : styles.packAnimalLabelInactive} title="Designate as pack animal — trappings marked 'stored on horse' will count toward this companion's encumbrance">
                        <input type="checkbox" checked={!!comp.isPackAnimal} onChange={(e) => {
                          // Only one pack animal at a time — unset others
                          if (e.target.checked) {
                            updateCharacter((c) => ({
                              ...c,
                              companions: c.companions.map((comp2, j) => ({ ...comp2, isPackAnimal: j === ci })),
                            }));
                          } else {
                            uc('isPackAnimal', false);
                          }
                        }} className={styles.checkboxCell} />
                        🐴 Pack Animal
                      </label>
                    </div>
                    <button type="button" onClick={() => handleDeleteCompanion(ci)} className={styles.deleteBtn}>✕</button>
                  </div>
                  <div className={styles.companionStats}>
                    {charKeys.map((k) => (
                      <div key={k} className={styles.companionStatCell}>
                        <div className={styles.companionStatLabel}>{k}</div>
                        <EditableField label="" value={comp[k]} type="number" onSave={(v) => uc(k, v)} style={{ minWidth: '32px' }} />
                      </div>
                    ))}
                  </div>
                  {/* Wound Tracking */}
                  {(() => {
                    const maxW = comp.W || 0;
                    const curW = comp.wCur ?? maxW;
                    const pct = maxW > 0 ? (curW / maxW) * 100 : 0;
                    const wColor = pct > 50 ? 'var(--success)' : pct > 20 ? 'var(--accent-gold)' : 'var(--danger)';
                    const wCountClass = pct > 50 ? styles.woundCountHigh : pct > 20 ? styles.woundCountMedium : styles.woundCountLow;
                    return (
                      <div className={styles.companionWoundBar}>
                        <div className={styles.companionWoundRow}>
                          <span className={styles.companionWoundLabel}>Wounds</span>
                          <button type="button" onClick={() => uc('wCur', Math.max(0, curW - 1))} className={styles.woundMinusBtn}>−</button>
                          <div className={styles.woundProgressContainer}>
                            <div className={styles.woundProgressTrack}>
                              <div className={styles.woundProgressFill} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: wColor }} />
                            </div>
                          </div>
                          <span className={wCountClass}>{curW}/{maxW}</span>
                          <button type="button" onClick={() => uc('wCur', Math.min(maxW, curW + 1))} className={styles.woundPlusBtn}>+</button>
                          <button type="button" onClick={() => uc('wCur', maxW)} className={styles.woundFullBtn}>Full</button>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Pack Animal Encumbrance */}
                  {comp.isPackAnimal && (() => {
                    const horseEnc = character.trappings.filter(t => t.storedOnHorse).reduce((s, t) => s + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);
                    return (
                      <div className={styles.packEncBar}>
                        <span className={styles.packEncLabel}>🐴 Carrying Encumbrance</span>
                        <span className={styles.packEncValue}>{horseEnc}</span>
                      </div>
                    );
                  })()}
                  <div className={styles.trainedSkillsRow}>
                    {TRAINED_SKILLS.map((skill) => {
                      const has = (comp.trained || []).includes(skill);
                      return (
                        <button key={skill} type="button" onClick={() => {
                          const next = has ? (comp.trained || []).filter((s: string) => s !== skill) : [...(comp.trained || []), skill];
                          uc('trained', next);
                        }} className={has ? styles.trainedSkillBtnActive : styles.trainedSkillBtn}>
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <EditableField label="Traits" value={comp.traits} onSave={(v) => uc('traits', v)} />
                  <EditableField label="Notes" value={comp.notes} onSave={(v) => uc('notes', v)} />
                </div>
              );
            })}
          </Card>

          {/* Animal Picker */}
          {showAnimalPicker && (
            <Picker items={ANIMAL_TEMPLATES} getLabel={(a) => a.name} getGroup={(a) => a.species} onSelect={(a) => { updateCharacter((c) => ({ ...c, companions: [...c.companions, { name: '', species: a.species, M: a.M, WS: a.WS, BS: a.BS, S: a.S, T: a.T, I: a.I, Ag: a.Ag, Dex: a.Dex, Int: a.Int, WP: a.WP, Fel: a.Fel, W: a.W, wCur: a.W, traits: a.traits, trained: [...a.trained], notes: a.notes }] })); setShowAnimalPicker(false); }} onClose={() => setShowAnimalPicker(false)} title="Select Animal Template" />
          )}
        </>
      )}

      <Toast
        message={undoToast.pending?.message ?? null}
        duration={5000}
        action={undoToast.pending ? { label: 'Undo', onAction: undoToast.undo } : undefined}
      />
    </div>
  );
}
