import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Character, EntryStatus, DowntimePeriod, EndeavourEntry, FieldPath, FieldValue } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Picker } from '../shared/Picker';
import { CalendarCheck, Trash2, AlertTriangle, Info, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import { SubTabBar } from '../shared/SubTabBar';
import { useTabOrder } from '../../hooks/useTabOrder';
import { saveLastSubTab, loadLastSubTab } from '../../logic/sub-tab-store';
import { JourneyTrackerPanel } from '../wilderness-travel/JourneyTrackerPanel';
import { HuntingReferencePanel } from '../hunting/HuntingReferencePanel';
import { OrganisedCrimePanel } from '../organised-crime/OrganisedCrimePanel';
import styles from './EndeavoursPage.module.css';
import { Toast } from '../shared/Toast';
import { useUndoToast } from '../../hooks/useUndoToast';
import { removeAtIndex, restoreAtIndex } from '../../logic/undo';
import {
  createDowntimePeriod,
  addDowntimePeriod,
  removeDowntimePeriod as removeDowntimePeriodFn,
  addEndeavourEntry,
  removeEndeavourEntry,
  updateEndeavourEntry,
  updateDowntimePeriod,
  moveEntryUp,
  moveEntryDown,
  validateSessionNumber,
  isElf,
  cycleStatus,
  migrateEntryStatus,
  getCostSummary,
  buildPickerItems,
  createEndeavourEntry,
  getMaxSessionNumber,
  generateId,
} from '../../logic/endeavours';
import type { PickerItem } from '../../logic/endeavours';
import { ENDEAVOUR_TEMPLATES, applyEndeavourTemplate } from '../../logic/endeavour-templates';

interface EndeavoursPageProps {
  character: Character;
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  subTab?: string | null;
  onSubTabChange?: (tab: string) => void;
}

type EndeavoursSubTab = 'endeavours' | 'travel' | 'hunting' | 'crime';

/** Get the CSS class for an entry row based on its status */
function getEntryRowClass(status: EntryStatus): string {
  if (status === 'in_progress') return styles.entryRowInProgress;
  if (status === 'completed') return styles.entryRowCompleted;
  return styles.entryRow;
}

/** Get the CSS class for the status cycling button */
function getStatusBtnClass(status: EntryStatus): string {
  if (status === 'in_progress') return styles.statusBtnInProgress;
  if (status === 'completed') return styles.statusBtnCompleted;
  return styles.statusBtn;
}

/** Get the visual indicator for a status */
function getStatusIndicator(status: EntryStatus): string {
  if (status === 'in_progress') return '◐';
  if (status === 'completed') return '✓';
  return '○';
}

/** Get accessible title for the status button */
function getStatusTitle(status: EntryStatus): string {
  if (status === 'pending') return 'Status: Pending — click to set In Progress';
  if (status === 'in_progress') return 'Status: In Progress — click to set Completed';
  return 'Status: Completed — click to set Pending';
}

const TOOLTIP_STORAGE_KEY = 'wfrp-hint-dismissed-status-tooltip';

export function EndeavoursPage({ character, updateCharacter, subTab, onSubTabChange }: EndeavoursPageProps) {
  // Optional Wilderness Travel mechanic (Deft Steps). When off, the Travel
  // sub-tab is not registered and its panel never mounts, and no SubTabBar is
  // rendered at all → zero DOM footprint, mirroring EstatePage's
  // useEnterprises-gated Enterprises tab.
  const useWildernessTravel = character.houseRules.useWildernessTravel === true;
  // Optional Hunting reference (Deft Steps). Its own toggle, independent of
  // Wilderness Travel. When off, the Hunting sub-tab is not registered and its
  // panel never mounts → zero DOM footprint.
  const useHunting = character.houseRules.useHunting === true;
  // Optional Organised Crime tracker (Deft Steps). Its own toggle, independent of
  // Wilderness Travel / Hunting. When off, the Crime sub-tab is not registered
  // and its panel never mounts → zero DOM footprint, and organisedCrime stays
  // absent from the character.
  const useOrganisedCrime = character.houseRules.useOrganisedCrime === true;

  // Memoised so it has a stable identity per toggle value and can be referenced
  // from effect dependency arrays without changing every render.
  const VALID_SUBTABS: EndeavoursSubTab[] = useMemo(() => {
    const t: EndeavoursSubTab[] = ['endeavours'];
    if (useWildernessTravel) t.push('travel');
    if (useHunting) t.push('hunting');
    if (useOrganisedCrime) t.push('crime');
    return t;
  }, [useWildernessTravel, useHunting, useOrganisedCrime]);

  // Tab reordering — conditionally include the Travel, Hunting, and Crime tabs.
  const defaultTabsList = useMemo(() => {
    const tabs = [{ id: 'endeavours', label: 'Endeavours' }];
    if (useWildernessTravel) {
      tabs.push({ id: 'travel', label: 'Travel' });
    }
    if (useHunting) {
      tabs.push({ id: 'hunting', label: 'Hunting' });
    }
    if (useOrganisedCrime) {
      tabs.push({ id: 'crime', label: 'Crime' });
    }
    return tabs;
  }, [useWildernessTravel, useHunting, useOrganisedCrime]);

  const { orderedTabs, isEditMode, toggleEditMode, moveLeft, moveRight, resetOrder, isDefaultOrder, saveError } = useTabOrder({
    pageKey: 'endeavours',
    defaultTabs: defaultTabsList,
  });

  // Active sub-tab: use URL hash > last stored > first ordered tab
  const resolveInitialTab = (): EndeavoursSubTab => {
    if (subTab && VALID_SUBTABS.includes(subTab as EndeavoursSubTab)) return subTab as EndeavoursSubTab;
    const stored = loadLastSubTab('endeavours');
    if (stored && VALID_SUBTABS.includes(stored as EndeavoursSubTab)) return stored as EndeavoursSubTab;
    const firstOrdered = orderedTabs[0]?.id;
    if (firstOrdered && VALID_SUBTABS.includes(firstOrdered as EndeavoursSubTab)) return firstOrdered as EndeavoursSubTab;
    return 'endeavours';
  };
  const [activeSubTab, setActiveSubTabInternal] = useState<EndeavoursSubTab>(resolveInitialTab);

  // Fall back if the current active tab is no longer valid (e.g. the Wilderness
  // Travel house rule was toggled off while the Travel tab was active).
  // Intentional setState-in-effect: reacts to an external house-rule toggle
  // (useWildernessTravel) that can invalidate the current tab, correcting it.
  useEffect(() => {
    if (!VALID_SUBTABS.includes(activeSubTab)) {
      const fallback = (orderedTabs[0]?.id as EndeavoursSubTab) || 'endeavours';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSubTabInternal(fallback);
      saveLastSubTab('endeavours', fallback);
      onSubTabChange?.(fallback);
    }
    // Intentionally narrow: this is specifically the reaction to an optional
    // house-rule toggling (Wilderness Travel / Hunting / Organised Crime) that
    // can invalidate the current tab. Re-running on
    // activeSubTab/orderedTabs/onSubTabChange changes would fight normal tab
    // navigation, so only the toggles belong here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWildernessTravel, useHunting, useOrganisedCrime]);

  // Sync from external subTab prop (e.g. URL hash changes).
  // Intentional setState-in-effect: mirrors an external routing input into
  // local state (see CharacterPage for the same pattern).
  useEffect(() => {
    if (subTab) {
      if (VALID_SUBTABS.includes(subTab as EndeavoursSubTab)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveSubTabInternal(subTab as EndeavoursSubTab);
      }
    }
  }, [subTab, VALID_SUBTABS]);

  // Wrapper that notifies parent and persists selection
  const setActiveSubTab = (tab: EndeavoursSubTab) => {
    setActiveSubTabInternal(tab);
    saveLastSubTab('endeavours', tab);
    onSubTabChange?.(tab);
  };

  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [addingToPeriodId, setAddingToPeriodId] = useState<string | null>(null);
  const [customForPeriodId, setCustomForPeriodId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { show: showUndo, undo, pending: undoPending } = useUndoToast();

  const [firstUseDismissed, setFirstUseDismissed] = useState(() => {
    try {
      return localStorage.getItem('wfrp-hint-dismissed-endeavours-first-use') === 'true';
    } catch {
      return false;
    }
  });

  const dismissFirstUseBanner = () => {
    setFirstUseDismissed(true);
    try {
      localStorage.setItem('wfrp-hint-dismissed-endeavours-first-use', 'true');
    } catch {
      // Graceful fallback
    }
  };
  const [statusTooltipDismissed, setStatusTooltipDismissed] = useState(() => {
    try {
      return localStorage.getItem(TOOLTIP_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dismissStatusTooltip = useCallback(() => {
    setStatusTooltipDismissed(true);
    try {
      localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable — dismiss for this session only
    }
  }, []);

  const endeavours = character.endeavours || [];
  const elfChar = isElf(character.species);

  const handleNewPeriod = () => {
    const period = createDowntimePeriod(character.status, endeavours);
    updateCharacter((c) => ({
      ...c,
      endeavours: addDowntimePeriod(c.endeavours, period),
    }));
    setToastMessage('Period added');
  };

  const handleDeletePeriod = (periodId: string) => {
    const periodIndex = endeavours.findIndex((p) => p.id === periodId);
    const period = endeavours[periodIndex];

    if (period && period.entries.length > 0) {
      // Multi-item deletion: period has entries, use ConfirmDialog
      updateCharacter((c) => ({
        ...c,
        endeavours: removeDowntimePeriodFn(c.endeavours, periodId),
      }));
      setDeletingPeriodId(null);
      setToastMessage('Period removed');
    } else if (period) {
      // Single-item deletion: period with 0 entries, use undo toast
      updateCharacter((c) => ({
        ...c,
        endeavours: removeAtIndex(c.endeavours || [], periodIndex),
      }));
      setDeletingPeriodId(null);
      showUndo('Period removed', period, periodIndex, (item, index) => {
        updateCharacter((c) => ({
          ...c,
          endeavours: restoreAtIndex(c.endeavours || [], item as DowntimePeriod, index),
        }));
      });
    }
  };

  const handleDeleteEntry = (periodId: string, entryId: string) => {
    const period = endeavours.find((p) => p.id === periodId);
    if (!period) return;
    const entryIndex = period.entries.findIndex((e) => e.id === entryId);
    const entry = period.entries[entryIndex];
    if (entryIndex < 0 || !entry) return;

    // Single-item deletion: use undo toast
    updateCharacter((c) => ({
      ...c,
      endeavours: removeEndeavourEntry(c.endeavours, periodId, entryId),
    }));
    showUndo('Entry removed', entry, entryIndex, (item, index) => {
      updateCharacter((c) => ({
        ...c,
        endeavours: (c.endeavours || []).map((p) =>
          p.id === periodId
            ? { ...p, entries: restoreAtIndex(p.entries, item as EndeavourEntry, index) }
            : p
        ),
      }));
    });
  };

  // Set of template type names for quick lookup
  const templateTypeNames = new Set(ENDEAVOUR_TEMPLATES.map(t => t.type.toLowerCase()));

  const handleSelectEndeavour = (periodId: string, item: PickerItem) => {
    if (item.label === '✏️ Custom (free text)') {
      setAddingToPeriodId(null);
      setCustomForPeriodId(periodId);
      setCustomInput('');
      return;
    }

    // Check if the selected item matches a template type
    if (templateTypeNames.has(item.label.toLowerCase())) {
      const result = applyEndeavourTemplate(item.label, character.status || undefined);
      const entry: EndeavourEntry = {
        id: generateId(),
        type: result.type,
        notes: result.notes,
        cost: result.cost,
        status: 'pending',
      };
      updateCharacter((c) => ({
        ...c,
        endeavours: addEndeavourEntry(c.endeavours, periodId, entry),
      }));
      setAddingToPeriodId(null);
      if (result.warning) {
        setToastMessage(result.warning);
      } else {
        setToastMessage('Endeavour added');
      }
      return;
    }

    const entry = createEndeavourEntry(item.label);
    updateCharacter((c) => ({
      ...c,
      endeavours: addEndeavourEntry(c.endeavours, periodId, entry),
    }));
    setAddingToPeriodId(null);
    setToastMessage('Endeavour added');
  };

  const handleAddCustom = () => {
    if (!customInput.trim() || customForPeriodId === null) return;
    const entry = createEndeavourEntry(customInput.trim());
    const pid = customForPeriodId;
    updateCharacter((c) => ({
      ...c,
      endeavours: addEndeavourEntry(c.endeavours, pid, entry),
    }));
    setCustomInput('');
    setCustomForPeriodId(null);
    setToastMessage('Endeavour added');
  };

  // Show the sub-tab bar only when more than one tab is registered (i.e. at
  // least one optional mechanic is on). With a single tab there is nothing to
  // switch between, so the downtime tracker renders exactly as before (zero
  // chrome added when all optional mechanics are off).
  const showSubTabBar = VALID_SUBTABS.length > 1;
  const showEndeavoursContent = !showSubTabBar || activeSubTab === 'endeavours';

  return (
    <div className={styles.sectionGap}>
      {/* Sub-tab navigation — only rendered when more than one tab is
          registered (an optional mechanic is on); otherwise there is a single
          tab and nothing to switch between, so zero chrome is added. */}
      {showSubTabBar && (
        <SubTabBar
          tabs={orderedTabs}
          activeTab={activeSubTab}
          onTabChange={(tab) => setActiveSubTab(tab as EndeavoursSubTab)}
          editMode={{
            isActive: isEditMode,
            onToggle: toggleEditMode,
            onMoveLeft: moveLeft,
            onMoveRight: moveRight,
            onReset: resetOrder,
            isDefaultOrder,
            saveError,
          }}
        />
      )}

      {showEndeavoursContent && (
      <>
      {/* First-use banner explaining Status → slots relationship */}
      {!firstUseDismissed && (
        <div className={styles.firstUseBanner}>
          <Info size={16} aria-hidden="true" />
          <span className={styles.firstUseBannerText}>
            Your Status tier determines how many endeavour slots you get per downtime period: Gold = 3, Silver = 2, Brass = 1.
          </span>
          <button
            type="button"
            className={styles.firstUseBannerClose}
            onClick={dismissFirstUseBanner}
            aria-label="Dismiss hint"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page header with New Downtime Period button */}
      <Card>
        <SectionHeader
          icon={CalendarCheck}
          title="Endeavours Tracker"
          action={<AddButton label="New Downtime Period" onClick={handleNewPeriod} />}
        />
        {getMaxSessionNumber(endeavours) != null && (
          <div className={styles.lastSessionLabel}>
            Last session: {getMaxSessionNumber(endeavours)}
          </div>
        )}
        {endeavours.length === 0 && (
          <EmptyState
            icon={CalendarCheck}
            heading="No downtime periods"
            description="Create one to start tracking Endeavours."
            action={{ label: 'New Period', onClick: handleNewPeriod }}
          />
        )}
      </Card>


      {/* Render each DowntimePeriod as a Card */}
      {endeavours.map((period) => {
        const used = period.entries.length;
        const total = period.slots;
        const allFilled = used === total && total > 0;
        const exceeded = used > total;
        const costSummary = getCostSummary(period.entries);

        return (
          <Card key={period.id}>
            {/* Period header: label, date, session, slots, delete */}
            <div className={styles.periodHeader}>
              <div className={styles.periodLabelField}>
                <EditableField
                  label="Period Label"
                  value={period.label}
                  onSave={(v) =>
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'label', String(v)),
                    }))
                  }
                />
              </div>
              <span className={styles.slotBadge} style={{
                background: exceeded ? 'rgba(200,80,80,0.15)' : allFilled ? 'rgba(90,154,90,0.15)' : 'var(--bg-tertiary)',
                color: exceeded ? 'var(--danger)' : allFilled ? 'var(--success)' : 'var(--text-secondary)',
                border: `1px solid ${exceeded ? 'var(--danger)' : allFilled ? 'var(--success)' : 'var(--border)'}`,
              }}>
                {used}/{total}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (period.entries.length > 0) {
                    // Multi-item: show confirm dialog
                    setDeletingPeriodId(period.id);
                  } else {
                    // Single-item (empty period): use undo toast directly
                    handleDeletePeriod(period.id);
                  }
                }}
                className={styles.removeBtn}
                title="Delete period"
              >
                <Trash2 size={16} />
              </button>
              <input
                type="date"
                value={period.date || ''}
                onChange={(e) =>
                  updateCharacter((c) => ({
                    ...c,
                    endeavours: updateDowntimePeriod(c.endeavours, period.id, 'date', e.target.value || undefined),
                  }))
                }
                className={styles.periodDateInput}
                title="Period date"
                aria-label="Period date"
              />
              <input
                type="number"
                min={1}
                max={9999}
                value={period.sessionNumber ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'sessionNumber', undefined),
                    }));
                  } else {
                    const validated = validateSessionNumber(val);
                    if (validated !== null) {
                      updateCharacter((c) => ({
                        ...c,
                        endeavours: updateDowntimePeriod(c.endeavours, period.id, 'sessionNumber', validated),
                      }));
                    }
                  }
                }}
                placeholder="Session #"
                className={styles.periodSessionInput}
                title="Session number"
                aria-label="Session number"
              />
              <div className={styles.periodSlotsField}>
                <EditableField
                  label="Slots"
                  value={period.slots}
                  type="number"
                  mode="always-editable"
                  onSave={(v) =>
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'slots', Math.max(0, Number(v))),
                    }))
                  }
                  style={{ width: '60px' }}
                />
                <HelpPopover concept="slot-calculation">{getHelpContent('slot-calculation')}</HelpPopover>
              </div>
            </div>

            {/* Status parse warning */}
            {period.statusWarning && (
              <div className={styles.warningBoxStatus}>
                <AlertTriangle size={14} />
                <span>Status could not be parsed — defaulted to 1 slot. You can edit the slot count manually.</span>
              </div>
            )}

            {/* Elf obligation reminder */}
            {elfChar && (
              <div className={styles.warningBoxElf}>
                <Info size={14} />
                <span>Elf characters must spend one Endeavour maintaining contact with their people.</span>
              </div>
            )}

            {/* All slots filled indicator */}
            {allFilled && !exceeded && (
              <div className={styles.warningBoxFilled}>
                <Check size={14} />
                <span>All slots filled.</span>
              </div>
            )}

            {/* Slots exceeded warning */}
            {exceeded && (
              <div className={styles.warningBoxExceeded}>
                <AlertTriangle size={14} />
                <span>Slots exceeded — {used} entries for {total} slot{total !== 1 ? 's' : ''}.</span>
              </div>
            )}

            {/* Endeavour entries list */}
            {/* Status legend — always visible above entries */}
            <div className={styles.statusLegend}>
              <span className={styles.statusLegendItem}>
                <span className={styles.statusLegendIcon}>○</span> Pending
              </span>
              <span className={styles.statusLegendItem}>
                <span className={styles.statusLegendIcon}>◐</span> In Progress
              </span>
              <span className={styles.statusLegendItem}>
                <span className={styles.statusLegendIcon}>✓</span> Completed
              </span>
            </div>

            {/* First-entry tooltip — shown once when first entry exists and not dismissed */}
            {period.entries.length > 0 && !statusTooltipDismissed && (
              <div className={styles.statusTooltipWrapper}>
                <div className={styles.statusTooltip}>
                  <span className={styles.statusTooltipText}>
                    ○ Pending → ◐ In Progress → ✓ Completed. Click to cycle.
                  </span>
                  <button
                    type="button"
                    className={styles.statusTooltipClose}
                    onClick={dismissStatusTooltip}
                    title="Dismiss hint"
                    aria-label="Dismiss status cycling hint"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className={styles.entriesList}>
              {period.entries.map((rawEntry) => {
                const entry = migrateEntryStatus(rawEntry);
                return (
                  <div
                    key={entry.id}
                    className={getEntryRowClass(entry.status)}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'status', cycleStatus(entry.status)),
                        }))
                      }
                      className={getStatusBtnClass(entry.status)}
                      title={getStatusTitle(entry.status)}
                      aria-label={getStatusTitle(entry.status)}
                    >
                      {getStatusIndicator(entry.status)}
                    </button>
                    <input
                      type="text"
                      value={entry.type}
                      onChange={(e) =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'type', e.target.value),
                        }))
                      }
                      maxLength={50}
                      placeholder="Type..."
                      className={entry.status === 'completed' ? styles.entryTypeInputCompleted : styles.entryTypeInput}
                      aria-label="Endeavour type"
                    />
                    <input
                      type="text"
                      value={entry.cost || ''}
                      onChange={(e) =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'cost', e.target.value),
                        }))
                      }
                      maxLength={50}
                      placeholder="Cost..."
                      className={entry.status === 'completed' ? styles.costInputCompleted : styles.costInput}
                    />
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'notes', e.target.value),
                        }))
                      }
                      placeholder="Notes..."
                      className={entry.status === 'completed' ? styles.notesInputCompleted : styles.notesInput}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: moveEntryUp(c.endeavours, period.id, entry.id),
                        }))
                      }
                      className={styles.moveBtn}
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: moveEntryDown(c.endeavours, period.id, entry.id),
                        }))
                      }
                      className={styles.moveBtn}
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(period.id, entry.id)}
                      className={styles.removeBtn}
                      title="Remove endeavour"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {period.entries.length === 0 && (
                <p className={styles.emptyEntries}>
                  No endeavours yet. Add one below.
                </p>
              )}
            </div>

            {/* Cost summary line */}
            {costSummary && (
              <div className={styles.costSummary}>
                Costs: {costSummary}
              </div>
            )}

            {/* Add Endeavour button */}
            <AddButton label="Add Endeavour" onClick={() => setAddingToPeriodId(period.id)} />

            {/* Endeavour type picker */}
            {addingToPeriodId === period.id && (
              <Picker<PickerItem>
                items={buildPickerItems(character.class, elfChar)}
                getLabel={(item) => item.label}
                getGroup={(item) => item.group}
                isDisabled={(item) => item.disabled === true}
                onSelect={(item) => handleSelectEndeavour(period.id, item)}
                onClose={() => setAddingToPeriodId(null)}
                title="Select Endeavour Type"
              />
            )}
          </Card>
        );
      })}
      </>
      )}

      {/* Wilderness Travel — double-guarded (active tab AND toggle on) so a
          stale hash never mounts the panel when the house rule is off. */}
      {activeSubTab === 'hunting' && useHunting && (
        <HuntingReferencePanel character={character} />
      )}
      {activeSubTab === 'travel' && useWildernessTravel && (
        <JourneyTrackerPanel character={character} updateCharacter={updateCharacter} />
      )}
      {activeSubTab === 'crime' && useOrganisedCrime && (
        <OrganisedCrimePanel character={character} updateCharacter={updateCharacter} />
      )}

      {/* Custom free-text input dialog */}
      {customForPeriodId !== null && (
        <div className={styles.customOverlay} onClick={() => setCustomForPeriodId(null)} role="dialog" aria-label="Custom Endeavour">
          <div className={styles.customDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.customTitle}>Custom Endeavour</h3>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); if (e.key === 'Escape') setCustomForPeriodId(null); }}
              placeholder="Enter endeavour type..."
              autoFocus
              className={styles.customInput}
            />
            <div className={styles.customActions}>
              <button type="button" onClick={() => setCustomForPeriodId(null)} className={styles.cancelBtn}>Cancel</button>
              <button type="button" onClick={handleAddCustom} className={styles.addBtn}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete period confirmation dialog */}
      {deletingPeriodId !== null && (
        <ConfirmDialog
          message="Delete this downtime period and all its endeavour entries?"
          onConfirm={() => handleDeletePeriod(deletingPeriodId)}
          onCancel={() => setDeletingPeriodId(null)}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />
      )}

      <Toast
        message={undoPending ? undoPending.message : toastMessage}
        duration={undoPending ? 5000 : 3000}
        action={undoPending ? { label: 'Undo', onAction: undo } : undefined}
      />

      {/* Tab order save error toast */}
      <Toast message={saveError ? 'Tab order could not be saved' : null} duration={5000} />
    </div>
  );
}

export default EndeavoursPage;
