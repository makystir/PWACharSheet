import { useState } from 'react';
import type { Character, ArmourPoints, Holding, Estate } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Home, Coins, ScrollText, Building } from 'lucide-react';
import styles from './EstatePage.module.css';

interface CurrencyAmount {
  gc: number;
  ss: number;
  d: number;
}

interface FinancialSummary {
  totalIncome: CurrencyAmount;
  totalExpenses: CurrencyAmount;
  profit: CurrencyAmount;
}

export function computeFinancialSummary(estate: Estate): FinancialSummary {
  const props = estate.properties || [];
  const totalIncome = {
    gc: (estate.monthlyIncome.gc || 0) + props.reduce((s, p) => s + (p.monthlyIncome?.gc || 0), 0),
    ss: (estate.monthlyIncome.ss || 0) + props.reduce((s, p) => s + (p.monthlyIncome?.ss || 0), 0),
    d: (estate.monthlyIncome.d || 0) + props.reduce((s, p) => s + (p.monthlyIncome?.d || 0), 0),
  };
  const totalExpenses = {
    gc: (estate.monthlyExpenses.gc || 0) + props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0),
    ss: (estate.monthlyExpenses.ss || 0) + props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0),
    d: (estate.monthlyExpenses.d || 0) + props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0),
  };
  const profit = {
    gc: totalIncome.gc - totalExpenses.gc,
    ss: totalIncome.ss - totalExpenses.ss,
    d: totalIncome.d - totalExpenses.d,
  };
  return { totalIncome, totalExpenses, profit };
}

interface EstatePageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}

type EstateSubTab = 'estate' | 'holdings' | 'wealth';

export function EstatePage({ character, update, updateCharacter }: EstatePageProps) {
  const [activeSubTab, setActiveSubTab] = useState<EstateSubTab>('wealth');
  const [noteInput, setNoteInput] = useState('');

  const est = character.estate;

  // Collect monthly income & pay expenses (including properties)
  const collectMonth = () => {
    const summary = computeFinancialSummary(est);
    updateCharacter((c) => ({
      ...c,
      estate: {
        ...c.estate,
        treasury: {
          gc: (c.estate.treasury.gc || 0) + summary.profit.gc,
          ss: (c.estate.treasury.ss || 0) + summary.profit.ss,
          d: (c.estate.treasury.d || 0) + summary.profit.d,
        },
      },
    }));
  };

  // Add note
  const addNote = () => {
    if (!noteInput.trim()) return;
    const newNotes = [...(est.notes || []), noteInput.trim()];
    update('estate.notes', newNotes);
    setNoteInput('');
  };

  return (
    <div className={styles.sectionGap}>
      {/* Sub-tab navigation */}
      <div className={styles.subTabBar}>
        <button type="button" className={activeSubTab === 'estate' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('estate')}>Estate</button>
        <button type="button" className={activeSubTab === 'holdings' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('holdings')}>Holdings</button>
        <button type="button" className={activeSubTab === 'wealth' ? styles.subTabActive : styles.subTab} onClick={() => setActiveSubTab('wealth')}>Wealth &amp; Finances</button>
      </div>

      {activeSubTab === 'estate' && (
      <>
      {/* Estate Header */}
      <Card>
        <SectionHeader icon={Home} title="Estate & Holdings" />
        <div className={styles.twoColGrid}>
          <EditableField label="Estate Name" value={est.name} onSave={(v) => update('estate.name', v)} />
          <EditableField label="Location" value={est.location} onSave={(v) => update('estate.location', v)} />
        </div>
        <div>
          <span className={styles.descriptionLabel}>Description</span>
          <textarea value={est.description} onChange={(e) => update('estate.description', e.target.value)} placeholder="Describe the estate, its history, current state..." className={styles.textarea} />
        </div>
      </Card>

      {/* Estate-level Monthly Income / Expenses */}
      <Card>
        <div className={styles.financePanelGrid}>
          <div className={styles.financePanel}>
            <div className={styles.financePanelTitleIncome}>Monthly Income</div>
            <div className={styles.currencyRow}>
              <EditableField label="GC" value={est.monthlyIncome.gc} type="number" onSave={(v) => update('estate.monthlyIncome.gc', v)} />
              <EditableField label="SS" value={est.monthlyIncome.ss} type="number" onSave={(v) => update('estate.monthlyIncome.ss', v)} />
              <EditableField label="D" value={est.monthlyIncome.d} type="number" onSave={(v) => update('estate.monthlyIncome.d', v)} />
            </div>
          </div>
          <div className={styles.financePanel}>
            <div className={styles.financePanelTitleExpense}>Monthly Expenses</div>
            <div className={styles.currencyRow}>
              <EditableField label="GC" value={est.monthlyExpenses.gc} type="number" onSave={(v) => update('estate.monthlyExpenses.gc', v)} />
              <EditableField label="SS" value={est.monthlyExpenses.ss} type="number" onSave={(v) => update('estate.monthlyExpenses.ss', v)} />
              <EditableField label="D" value={est.monthlyExpenses.d} type="number" onSave={(v) => update('estate.monthlyExpenses.d', v)} />
            </div>
          </div>
        </div>
      </Card>
      </>
      )}

      {activeSubTab === 'wealth' && (
      <>
      {/* Monthly Financial Summary */}
      {(() => {
        const summary = computeFinancialSummary(est);
        const { totalIncome, totalExpenses, profit } = summary;
        const props = est.properties || [];
        const propIncGC = props.reduce((s, p) => s + (p.monthlyIncome?.gc || 0), 0);
        const propIncSS = props.reduce((s, p) => s + (p.monthlyIncome?.ss || 0), 0);
        const propIncD = props.reduce((s, p) => s + (p.monthlyIncome?.d || 0), 0);
        const propExpGC = props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0);
        const propExpSS = props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0);
        const propExpD = props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0);
        const isProfit = profit.gc > 0 || profit.ss > 0 || profit.d > 0;
        const isLoss = profit.gc < 0 || profit.ss < 0 || profit.d < 0;
        return (
          <Card>
            <SectionHeader icon={Coins} title="Monthly Financial Summary" />
            <div className={styles.summaryGrid}>
              <div>
                <div className={styles.summaryLabel}>Total Income</div>
                <div className={styles.summaryIncome}>{totalIncome.gc > 0 ? `${totalIncome.gc}gc ` : ''}{totalIncome.ss > 0 ? `${totalIncome.ss}ss ` : ''}{totalIncome.d > 0 ? `${totalIncome.d}d` : ''}{totalIncome.gc === 0 && totalIncome.ss === 0 && totalIncome.d === 0 ? '—' : ''}</div>
                {propIncGC + propIncSS + propIncD > 0 && <div className={styles.summaryPropDetail}>Properties: {propIncGC > 0 ? `${propIncGC}gc ` : ''}{propIncSS > 0 ? `${propIncSS}ss ` : ''}{propIncD > 0 ? `${propIncD}d` : ''}</div>}
              </div>
              <div>
                <div className={styles.summaryLabel}>Total Expenses</div>
                <div className={styles.summaryExpense}>{totalExpenses.gc > 0 ? `${totalExpenses.gc}gc ` : ''}{totalExpenses.ss > 0 ? `${totalExpenses.ss}ss ` : ''}{totalExpenses.d > 0 ? `${totalExpenses.d}d` : ''}{totalExpenses.gc === 0 && totalExpenses.ss === 0 && totalExpenses.d === 0 ? '—' : ''}</div>
                {propExpGC + propExpSS + propExpD > 0 && <div className={styles.summaryPropDetail}>Properties: {propExpGC > 0 ? `${propExpGC}gc ` : ''}{propExpSS > 0 ? `${propExpSS}ss ` : ''}{propExpD > 0 ? `${propExpD}d` : ''}</div>}
              </div>
              <div>
                <div className={styles.summaryLabel}>Monthly Profit</div>
                <div className={isProfit ? styles.profitPositive : isLoss ? styles.profitNegative : styles.profitNeutral}>
                  {profit.gc !== 0 ? `${profit.gc}gc ` : ''}{profit.ss !== 0 ? `${profit.ss}ss ` : ''}{profit.d !== 0 ? `${profit.d}d` : ''}{profit.gc === 0 && profit.ss === 0 && profit.d === 0 ? '—' : ''}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Treasury / Collect */}
      <Card>
        <div>
          <div className={styles.treasuryPanel}>
            <div className={styles.treasuryTitle}>Treasury</div>
            <div className={styles.currencyRow}>
              <EditableField label="GC" value={est.treasury.gc} type="number" onSave={(v) => update('estate.treasury.gc', v)} />
              <EditableField label="SS" value={est.treasury.ss} type="number" onSave={(v) => update('estate.treasury.ss', v)} />
              <EditableField label="D" value={est.treasury.d} type="number" onSave={(v) => update('estate.treasury.d', v)} />
            </div>
          </div>
        </div>
        <button type="button" onClick={collectMonth} className={styles.collectBtn}>
          Collect Monthly Income &amp; Pay Expenses
        </button>
      </Card>
      </>
      )}

      {activeSubTab === 'holdings' && (
      <Card>
        <SectionHeader icon={Building} title="Holdings & Properties" action={
          <AddButton label="Add Property" onClick={() => {
            const newProp: Holding = { name: '', type: 'Other', status: 'Active', location: '', income: '', expenses: '', monthlyIncome: { d: 0, ss: 0, gc: 0 }, monthlyExpenses: { d: 0, ss: 0, gc: 0 }, condition: 100, staff: 0, notes: '' };
            updateCharacter((c) => ({ ...c, estate: { ...c.estate, properties: [...(c.estate.properties || []), newProp] } }));
          }} />
        } />
        {(est.properties || []).length === 0 && (est.holdings || []).length === 0 && (
          <div className={styles.emptyMessage}>No properties yet. Add one to start managing your holdings.</div>
        )}
        {/* Legacy string holdings (read-only migration display) */}
        {(est.holdings || []).filter(h => typeof h === 'string' && h).map((h, i) => (
          <div key={`legacy-${i}`} className={styles.legacyHolding}>
            <span className={styles.legacyHoldingText}>{h} <span className={styles.legacyTag}>(legacy)</span></span>
            <button type="button" onClick={() => { const n = [...(est.holdings || [])]; n.splice(i, 1); update('estate.holdings', n); }} className={styles.removeBtn}>✕</button>
          </div>
        ))}
        {/* Rich property cards */}
        <div className={styles.propertyList}>
          {(est.properties || []).map((prop, i) => {
            const up2 = (field: string, val: unknown) => {
              updateCharacter((c) => {
                const props = [...(c.estate.properties || [])];
                props[i] = { ...props[i], [field]: val };
                return { ...c, estate: { ...c.estate, properties: props } };
              });
            };
            const statusColor = prop.status === 'Active' ? 'var(--success)' : prop.status === 'Damaged' ? 'var(--warning, #c8a832)' : prop.status === 'Destroyed' ? 'var(--danger)' : prop.status === 'Under Construction' ? 'var(--accent-gold)' : 'var(--text-muted)';
            return (
              <div key={i} className={styles.propertyCard}>
                <div className={styles.propertyHeader}>
                  <EditableField label="Name" value={prop.name} onSave={(v) => up2('name', v)} />
                  <button type="button" onClick={() => updateCharacter((c) => ({ ...c, estate: { ...c.estate, properties: (c.estate.properties || []).filter((_, j) => j !== i) } }))} className={styles.removeBtn}>✕</button>
                </div>
                <div className={styles.propertyFieldsGrid}>
                  <div>
                    <span className={styles.fieldLabel}>Type</span>
                    <select value={prop.type} onChange={(e) => up2('type', e.target.value)} className={styles.selectField}>
                      {['Inn', 'Tavern', 'Farm', 'Mill', 'Workshop', 'Shop', 'Warehouse', 'Manor', 'Mine', 'Smithy', 'Stable', 'Dock', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className={styles.fieldLabel}>Status</span>
                    <select value={prop.status} onChange={(e) => up2('status', e.target.value)} className={styles.selectField} style={{ color: statusColor }}>
                      {['Active', 'Under Construction', 'Damaged', 'Destroyed', 'Abandoned'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <EditableField label="Location" value={prop.location} onSave={(v) => up2('location', v)} />
                </div>
                <div className={styles.propFinanceGrid}>
                  <div className={styles.propIncomePanel}>
                    <span className={styles.propFinanceLabelIncome}>Monthly Income</span>
                    <div className={styles.propCurrencyRow}>
                      <EditableField label="GC" value={prop.monthlyIncome?.gc ?? 0} type="number" onSave={(v) => { const mi = { ...(prop.monthlyIncome || { d: 0, ss: 0, gc: 0 }), gc: Number(v) }; up2('monthlyIncome', mi); }} />
                      <EditableField label="SS" value={prop.monthlyIncome?.ss ?? 0} type="number" onSave={(v) => { const mi = { ...(prop.monthlyIncome || { d: 0, ss: 0, gc: 0 }), ss: Number(v) }; up2('monthlyIncome', mi); }} />
                      <EditableField label="D" value={prop.monthlyIncome?.d ?? 0} type="number" onSave={(v) => { const mi = { ...(prop.monthlyIncome || { d: 0, ss: 0, gc: 0 }), d: Number(v) }; up2('monthlyIncome', mi); }} />
                    </div>
                  </div>
                  <div className={styles.propExpensePanel}>
                    <span className={styles.propFinanceLabelExpense}>Monthly Expenses</span>
                    <div className={styles.propCurrencyRow}>
                      <EditableField label="GC" value={prop.monthlyExpenses?.gc ?? 0} type="number" onSave={(v) => { const me = { ...(prop.monthlyExpenses || { d: 0, ss: 0, gc: 0 }), gc: Number(v) }; up2('monthlyExpenses', me); }} />
                      <EditableField label="SS" value={prop.monthlyExpenses?.ss ?? 0} type="number" onSave={(v) => { const me = { ...(prop.monthlyExpenses || { d: 0, ss: 0, gc: 0 }), ss: Number(v) }; up2('monthlyExpenses', me); }} />
                      <EditableField label="D" value={prop.monthlyExpenses?.d ?? 0} type="number" onSave={(v) => { const me = { ...(prop.monthlyExpenses || { d: 0, ss: 0, gc: 0 }), d: Number(v) }; up2('monthlyExpenses', me); }} />
                    </div>
                  </div>
                </div>
                <div className={styles.conditionGrid}>
                  <div>
                    <span className={styles.fieldLabel}>Condition</span>
                    <div className={styles.conditionRow}>
                      <div className={styles.conditionTrack}>
                        <div className={styles.conditionFill} style={{ width: `${prop.condition}%`, background: prop.condition > 60 ? 'var(--success)' : prop.condition > 30 ? 'var(--accent-gold)' : 'var(--danger)' }} />
                      </div>
                      <input type="number" value={prop.condition} onChange={(e) => up2('condition', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className={styles.conditionInput} />
                      <span className={styles.conditionPct}>%</span>
                    </div>
                  </div>
                  <EditableField label="Staff" value={prop.staff} type="number" onSave={(v) => up2('staff', v)} />
                </div>
                <div>
                  <span className={styles.fieldLabel}>Notes</span>
                  <textarea value={prop.notes} onChange={(e) => up2('notes', e.target.value)} placeholder="Business details, improvements, events..." className={styles.propNotesTextarea} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      )}



      {activeSubTab === 'estate' && (
      <Card>
        <SectionHeader icon={ScrollText} title="Estate Notes & Journal" />
        <div className={styles.noteInputRow}>
          <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a new estate note..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }} className={styles.noteTextarea} />
          <AddButton label="Add" onClick={addNote} />
        </div>
        <div className={styles.notesList}>
          {(est.notes || []).map((note, i) => (
            <div key={i} className={styles.noteCard}>
              <div className={styles.noteHeader}>
                <span className={styles.noteTimestamp}>{typeof note === 'string' ? '' : ''}</span>
                <button type="button" onClick={() => { const n = [...(est.notes || [])]; n.splice(i, 1); update('estate.notes', n); }} className={styles.removeBtn}>✕</button>
              </div>
              <div className={styles.noteText}>{typeof note === 'string' ? note : ''}</div>
            </div>
          ))}
          {(est.notes || []).length === 0 && (
            <p className={styles.notesEmpty}>No estate notes yet.</p>
          )}
        </div>
      </Card>
      )}
    </div>
  );
}
