import { useState } from 'react';
import ProtectionRuneSection from './ProtectionRuneSection';
import EngineeringRuneSection from './EngineeringRuneSection';
import DoomRuneSection from './DoomRuneSection';
import type { ProtectionItem, EngineeringItem, DoomRuneActivation } from '../../types/character';
import styles from './RunePanel.module.css';

const RUNE_TABS = [
  { id: 'weapon', label: 'Weapon' },
  { id: 'armour', label: 'Armour' },
  { id: 'talisman', label: 'Talisman' },
  { id: 'protection', label: 'Protection' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'doom', label: 'Doom' },
] as const;

type RuneTabId = (typeof RUNE_TABS)[number]['id'];

export interface RunePanelProps {
  knownRunes: string[];
  protectionItems: ProtectionItem[];
  engineeringItems: EngineeringItem[];
  doomRuneActivations: DoomRuneActivation[];
  forgingCharges: Record<string, number>;
  onAddProtectionItem: (item: ProtectionItem) => void;
  onEditProtectionItem: (item: ProtectionItem) => void;
  onRemoveProtectionItem: (itemId: string) => void;
  onInscribeProtectionRune: (itemId: string, runeId: string) => void;
  onRemoveProtectionRune: (itemId: string, runeIndex: number) => void;
  onAddEngineeringItem: (item: EngineeringItem) => void;
  onRemoveEngineeringItem: (itemId: string) => void;
  onInscribeEngineeringRune: (itemId: string, runeId: string) => void;
  onRemoveEngineeringRune: (itemId: string, runeIndex: number) => void;
  onActivateForging: (itemId: string) => void;
  onResetCharges: () => void;
  onActivateDoomRune: (runeId: string) => void;
}

export default function RunePanel({
  knownRunes,
  protectionItems,
  engineeringItems,
  doomRuneActivations,
  forgingCharges,
  onAddProtectionItem,
  onEditProtectionItem,
  onRemoveProtectionItem,
  onInscribeProtectionRune,
  onRemoveProtectionRune,
  onAddEngineeringItem,
  onRemoveEngineeringItem,
  onInscribeEngineeringRune,
  onRemoveEngineeringRune,
  onActivateForging,
  onResetCharges,
  onActivateDoomRune,
}: RunePanelProps) {
  const [activeTab, setActiveTab] = useState<RuneTabId>('weapon');

  return (
    <div className={styles.container}>
      <div role="tablist" aria-label="Rune categories" className={styles.tabList}>
        {RUNE_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`rune-tab-${tab.id}`}
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`rune-tabpanel-${tab.id}`}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`rune-tabpanel-${activeTab}`}
        aria-labelledby={`rune-tab-${activeTab}`}
        className={styles.tabPanel}
      >
        {activeTab === 'weapon' && <p>Weapon runes content</p>}
        {activeTab === 'armour' && <p>Armour runes content</p>}
        {activeTab === 'talisman' && <p>Talisman runes content</p>}
        {activeTab === 'protection' && (
          <ProtectionRuneSection
            knownRunes={knownRunes}
            protectionItems={protectionItems}
            onAddItem={onAddProtectionItem}
            onEditItem={onEditProtectionItem}
            onRemoveItem={onRemoveProtectionItem}
            onInscribeRune={onInscribeProtectionRune}
            onRemoveRune={onRemoveProtectionRune}
          />
        )}
        {activeTab === 'engineering' && (
          <EngineeringRuneSection
            knownRunes={knownRunes}
            engineeringItems={engineeringItems}
            forgingCharges={forgingCharges}
            onAddItem={onAddEngineeringItem}
            onRemoveItem={onRemoveEngineeringItem}
            onInscribeRune={onInscribeEngineeringRune}
            onRemoveRune={onRemoveEngineeringRune}
            onActivateForging={onActivateForging}
            onResetCharges={onResetCharges}
          />
        )}
        {activeTab === 'doom' && (
          <DoomRuneSection
            knownRunes={knownRunes}
            doomRuneActivations={doomRuneActivations}
            onActivate={onActivateDoomRune}
          />
        )}
      </div>
    </div>
  );
}
