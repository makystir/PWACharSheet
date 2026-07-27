import { useState, useMemo, useEffect } from 'react';
import type { SpellData, Talent } from '../../types/character';
import { deriveCharacterLore, filterSpells, groupByLore, getAvailableLores } from '../../logic/spell-picker-utils';
import styles from './SpellPicker.module.css';

interface SpellPickerProps {
  spells: SpellData[];
  characterTalents: Talent[];
  knownSpellNames: Set<string>;
  onSelect: (spell: SpellData) => void;
  onClose: () => void;
  title?: string;
}

export function SpellPicker({
  spells,
  characterTalents,
  knownSpellNames,
  onSelect,
  onClose,
  title,
}: SpellPickerProps) {
  const derivedLore = useMemo(() => deriveCharacterLore(characterTalents), [characterTalents]);
  const [activeLore, setActiveLore] = useState<string | null>(derivedLore);
  const [searchText, setSearchText] = useState('');
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);

  const availableLores = useMemo(() => getAvailableLores(spells), [spells]);

  const filtered = useMemo(
    () => filterSpells(spells, activeLore, searchText),
    [spells, activeLore, searchText]
  );

  const grouped = useMemo(() => groupByLore(filtered), [filtered]);

  // Scroll lock on mount/unmount
  useEffect(() => {
    document.body.classList.add('spellPickerOpen');
    return () => {
      document.body.classList.remove('spellPickerOpen');
    };
  }, []);

  const handleSpellClick = (spell: SpellData) => {
    const isKnown = knownSpellNames.has(spell.name);
    if (isKnown) return;

    if (expandedSpell === spell.name) {
      // Already expanded — select it
      onSelect(spell);
    } else {
      // Expand to show detail
      setExpandedSpell(spell.name);
    }
  };

  const renderSpellItem = (spell: SpellData) => {
    const isKnown = knownSpellNames.has(spell.name);
    const isExpanded = expandedSpell === spell.name;

    return (
      <div key={spell.name}>
        <button
          type="button"
          className={`${styles.spellItem} ${isKnown ? styles.spellItemKnown : ''}`}
          onClick={() => handleSpellClick(spell)}
          aria-disabled={isKnown ? 'true' : undefined}
        >
          {isKnown && <span className={styles.knownIcon} aria-label="Already known">✓</span>}
          <span className={styles.spellName}>{spell.name}</span>
          <span className={styles.spellCn}>CN {spell.cn}</span>
        </button>
        <div className={`${styles.spellDetail} ${isExpanded ? styles.spellDetailOpen : ''}`}>
          {isExpanded && (
            <>
              <div className={styles.detailRow}><strong>Range:</strong> {spell.range}</div>
              <div className={styles.detailRow}><strong>Target:</strong> {spell.target}</div>
              <div className={styles.detailRow}><strong>Duration:</strong> {spell.duration}</div>
              <div className={styles.detailRow}><strong>Effect:</strong> {spell.effect}</div>
              {!isKnown && (
                <button
                  type="button"
                  className={styles.selectBtn}
                  onClick={() => onSelect(spell)}
                >
                  Select
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSpellList = () => {
    if (filtered.length === 0) {
      return <div className={styles.emptyMessage}>No spells found</div>;
    }

    // When a specific lore is active, render flat list
    if (activeLore !== null) {
      return filtered.map((spell) => renderSpellItem(spell));
    }

    // When "All" tab is active, render grouped by lore
    return grouped.map((group) => (
      <div key={group.lore}>
        <div className={styles.groupHeader}>{group.lore}</div>
        {group.spells.map((spell) => renderSpellItem(spell))}
      </div>
    ));
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label={title || 'Spell Picker'}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title || 'Select Spell'}</h3>
          <button type="button" className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search spells..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.search}
            autoFocus
          />
        </div>

        <div className={styles.tabBar} role="tablist">
          <button
            type="button"
            className={`${styles.tab} ${activeLore === null ? styles.tabActive : ''}`}
            role="tab"
            aria-selected={activeLore === null}
            onClick={() => setActiveLore(null)}
          >
            All
          </button>
          {availableLores.map((lore) => (
            <button
              key={lore}
              type="button"
              className={`${styles.tab} ${activeLore === lore ? styles.tabActive : ''}`}
              role="tab"
              aria-selected={activeLore === lore}
              onClick={() => setActiveLore(lore)}
            >
              {lore}
            </button>
          ))}
        </div>

        <div className={styles.spellList}>
          {renderSpellList()}
        </div>
      </div>
    </div>
  );
}
