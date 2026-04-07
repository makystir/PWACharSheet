import { useState } from 'react';
import type { Character, ArmourPoints, LedgerEntry, Holding } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Home, Coins, ScrollText, Building } from 'lucide-react';

interface EstatePageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}

const sectionGap = { display: 'flex', flexDirection: 'column' as const, gap: '16px' };
const smallBtn = { padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' };

export function EstatePage({ character, update, updateCharacter }: EstatePageProps) {
  const [ledgerType, setLedgerType] = useState<string | null>(null);
  const [ledgerDesc, setLedgerDesc] = useState('');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const est = character.estate;

  // Collect monthly income & pay expenses (including properties)
  const collectMonth = () => {
    const inc = est.monthlyIncome;
    const exp = est.monthlyExpenses;
    // Sum property income/expenses
    const props = est.properties || [];
    const propIncGC = props.reduce((s, p) => s + (p.monthlyIncome?.gc || 0), 0);
    const propIncSS = props.reduce((s, p) => s + (p.monthlyIncome?.ss || 0), 0);
    const propIncD = props.reduce((s, p) => s + (p.monthlyIncome?.d || 0), 0);
    const propExpGC = props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0);
    const propExpSS = props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0);
    const propExpD = props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0);
    const totalIncGC = (inc.gc || 0) + propIncGC;
    const totalIncSS = (inc.ss || 0) + propIncSS;
    const totalIncD = (inc.d || 0) + propIncD;
    const totalExpGC = (exp.gc || 0) + propExpGC;
    const totalExpSS = (exp.ss || 0) + propExpSS;
    const totalExpD = (exp.d || 0) + propExpD;
    const netGC = (est.treasury.gc || 0) + totalIncGC - totalExpGC;
    const netSS = (est.treasury.ss || 0) + totalIncSS - totalExpSS;
    const netD = (est.treasury.d || 0) + totalIncD - totalExpD;
    const entry: LedgerEntry = { timestamp: Date.now(), type: 'Monthly', description: 'Monthly collection (estate + properties)', amount: { d: totalIncD - totalExpD, ss: totalIncSS - totalExpSS, gc: totalIncGC - totalExpGC } };
    updateCharacter((c) => ({
      ...c,
      estate: { ...c.estate, treasury: { gc: netGC, ss: netSS, d: netD }, ledger: [...c.estate.ledger, entry] },
    }));
  };

  // Add ledger entry
  const addLedgerEntry = () => {
    if (!ledgerType || !ledgerDesc.trim()) return;
    const entry: LedgerEntry = { timestamp: Date.now(), type: ledgerType, description: ledgerDesc.trim(), amount: { d: 0, ss: 0, gc: 0 } };
    // Parse amount string like "5gc" or "10ss"
    const amtStr = ledgerAmount.trim().toLowerCase();
    if (amtStr.includes('gc')) entry.amount.gc = parseInt(amtStr) || 0;
    else if (amtStr.includes('ss')) entry.amount.ss = parseInt(amtStr) || 0;
    else if (amtStr.includes('d')) entry.amount.d = parseInt(amtStr) || 0;
    updateCharacter((c) => ({ ...c, estate: { ...c.estate, ledger: [...c.estate.ledger, entry] } }));
    setLedgerDesc('');
    setLedgerAmount('');
    setLedgerType(null);
  };

  // Add note
  const addNote = () => {
    if (!noteInput.trim()) return;
    const newNotes = [...(est.notes || []), noteInput.trim()];
    update('estate.notes', newNotes);
    setNoteInput('');
  };

  return (
    <div style={sectionGap}>
      {/* Estate Header */}
      <Card>
        <SectionHeader icon={Home} title="Estate & Holdings" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
          <EditableField label="Estate Name" value={est.name} onSave={(v) => update('estate.name', v)} />
          <EditableField label="Location" value={est.location} onSave={(v) => update('estate.location', v)} />
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</span>
          <textarea value={est.description} onChange={(e) => update('estate.description', e.target.value)} placeholder="Describe the estate, its history, current state..." style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px', fontSize: '13px', minHeight: '60px', resize: 'vertical', marginTop: '2px' }} />
        </div>
      </Card>

      {/* Treasury / Income / Expenses */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'rgba(90,154,90,0.1)', border: '1px solid rgba(90,154,90,0.3)', borderRadius: '6px', padding: '10px 14px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700, color: 'var(--success)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>Treasury</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <EditableField label="GC" value={est.treasury.gc} type="number" onSave={(v) => update('estate.treasury.gc', v)} />
              <EditableField label="SS" value={est.treasury.ss} type="number" onSave={(v) => update('estate.treasury.ss', v)} />
              <EditableField label="D" value={est.treasury.d} type="number" onSave={(v) => update('estate.treasury.d', v)} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700, color: 'var(--parchment)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>Monthly Income</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <EditableField label="GC" value={est.monthlyIncome.gc} type="number" onSave={(v) => update('estate.monthlyIncome.gc', v)} />
              <EditableField label="SS" value={est.monthlyIncome.ss} type="number" onSave={(v) => update('estate.monthlyIncome.ss', v)} />
              <EditableField label="D" value={est.monthlyIncome.d} type="number" onSave={(v) => update('estate.monthlyIncome.d', v)} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700, color: 'var(--danger)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>Monthly Expenses</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <EditableField label="GC" value={est.monthlyExpenses.gc} type="number" onSave={(v) => update('estate.monthlyExpenses.gc', v)} />
              <EditableField label="SS" value={est.monthlyExpenses.ss} type="number" onSave={(v) => update('estate.monthlyExpenses.ss', v)} />
              <EditableField label="D" value={est.monthlyExpenses.d} type="number" onSave={(v) => update('estate.monthlyExpenses.d', v)} />
            </div>
          </div>
        </div>
        <button type="button" onClick={collectMonth} style={{ width: '100%', padding: '10px', marginTop: '12px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', background: 'rgba(90,154,90,0.2)', border: '1px solid var(--success)', color: 'var(--success)', textTransform: 'uppercase' }}>
          Collect Monthly Income &amp; Pay Expenses
        </button>
      </Card>

      {/* Holdings & Properties */}
      <Card>
        <SectionHeader icon={Building} title="Holdings & Properties" action={
          <AddButton label="Add Property" onClick={() => {
            const newProp: Holding = { name: '', type: 'Other', status: 'Active', location: '', income: '', expenses: '', monthlyIncome: { d: 0, ss: 0, gc: 0 }, monthlyExpenses: { d: 0, ss: 0, gc: 0 }, condition: 100, staff: 0, notes: '' };
            updateCharacter((c) => ({ ...c, estate: { ...c.estate, properties: [...(c.estate.properties || []), newProp] } }));
          }} />
        } />
        {(est.properties || []).length === 0 && (est.holdings || []).length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>No properties yet. Add one to start managing your holdings.</div>
        )}
        {/* Legacy string holdings (read-only migration display) */}
        {(est.holdings || []).filter(h => typeof h === 'string' && h).map((h, i) => (
          <div key={`legacy-${i}`} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '5px', padding: '8px 12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{h} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>(legacy)</span></span>
            <button type="button" onClick={() => { const n = [...(est.holdings || [])]; n.splice(i, 1); update('estate.holdings', n); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        ))}
        {/* Rich property cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <EditableField label="Name" value={prop.name} onSave={(v) => up2('name', v)} />
                  <button type="button" onClick={() => updateCharacter((c) => ({ ...c, estate: { ...c.estate, properties: (c.estate.properties || []).filter((_, j) => j !== i) } }))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Type</span>
                    <select value={prop.type} onChange={(e) => up2('type', e.target.value)} style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}>
                      {['Inn', 'Tavern', 'Farm', 'Mill', 'Workshop', 'Shop', 'Warehouse', 'Manor', 'Mine', 'Smithy', 'Stable', 'Dock', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Status</span>
                    <select value={prop.status} onChange={(e) => up2('status', e.target.value)} style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: statusColor, fontSize: '12px' }}>
                      {['Active', 'Under Construction', 'Damaged', 'Destroyed', 'Abandoned'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <EditableField label="Location" value={prop.location} onSave={(v) => up2('location', v)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ background: 'rgba(90,154,90,0.06)', border: '1px solid rgba(90,154,90,0.2)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--success)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Monthly Income</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <EditableField label="GC" value={prop.monthlyIncome?.gc ?? 0} type="number" onSave={(v) => { const mi = { ...(prop.monthlyIncome || { d: 0, ss: 0, gc: 0 }), gc: Number(v) }; up2('monthlyIncome', mi); }} />
                      <EditableField label="SS" value={prop.monthlyIncome?.ss ?? 0} type="number" onSave={(v) => { const mi = { ...(prop.monthlyIncome || { d: 0, ss: 0, gc: 0 }), ss: Number(v) }; up2('monthlyIncome', mi); }} />
                      <EditableField label="D" value={prop.monthlyIncome?.d ?? 0} type="number" onSave={(v) => { const mi = { ...(prop.monthlyIncome || { d: 0, ss: 0, gc: 0 }), d: Number(v) }; up2('monthlyIncome', mi); }} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(200,80,80,0.06)', border: '1px solid rgba(200,80,80,0.2)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--danger)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Monthly Expenses</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <EditableField label="GC" value={prop.monthlyExpenses?.gc ?? 0} type="number" onSave={(v) => { const me = { ...(prop.monthlyExpenses || { d: 0, ss: 0, gc: 0 }), gc: Number(v) }; up2('monthlyExpenses', me); }} />
                      <EditableField label="SS" value={prop.monthlyExpenses?.ss ?? 0} type="number" onSave={(v) => { const me = { ...(prop.monthlyExpenses || { d: 0, ss: 0, gc: 0 }), ss: Number(v) }; up2('monthlyExpenses', me); }} />
                      <EditableField label="D" value={prop.monthlyExpenses?.d ?? 0} type="number" onSave={(v) => { const me = { ...(prop.monthlyExpenses || { d: 0, ss: 0, gc: 0 }), d: Number(v) }; up2('monthlyExpenses', me); }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Condition</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ flex: 1, background: 'var(--bg-primary)', borderRadius: '3px', height: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ height: '100%', width: `${prop.condition}%`, background: prop.condition > 60 ? 'var(--success)' : prop.condition > 30 ? 'var(--accent-gold)' : 'var(--danger)', borderRadius: '2px', transition: 'width 0.3s' }} />
                      </div>
                      <input type="number" value={prop.condition} onChange={(e) => up2('condition', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} style={{ width: '36px', padding: '2px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px', textAlign: 'center' }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                  <EditableField label="Staff" value={prop.staff} type="number" onSave={(v) => up2('staff', v)} />
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Notes</span>
                  <textarea value={prop.notes} onChange={(e) => up2('notes', e.target.value)} placeholder="Business details, improvements, events..." style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '6px 8px', fontSize: '12px', minHeight: '36px', resize: 'vertical' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Monthly Profits Summary */}
      {(() => {
        const props = est.properties || [];
        const propIncGC = props.reduce((s, p) => s + (p.monthlyIncome?.gc || 0), 0);
        const propIncSS = props.reduce((s, p) => s + (p.monthlyIncome?.ss || 0), 0);
        const propIncD = props.reduce((s, p) => s + (p.monthlyIncome?.d || 0), 0);
        const propExpGC = props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0);
        const propExpSS = props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0);
        const propExpD = props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0);
        const totalIncGC = (est.monthlyIncome.gc || 0) + propIncGC;
        const totalIncSS = (est.monthlyIncome.ss || 0) + propIncSS;
        const totalIncD = (est.monthlyIncome.d || 0) + propIncD;
        const totalExpGC = (est.monthlyExpenses.gc || 0) + propExpGC;
        const totalExpSS = (est.monthlyExpenses.ss || 0) + propExpSS;
        const totalExpD = (est.monthlyExpenses.d || 0) + propExpD;
        const profitGC = totalIncGC - totalExpGC;
        const profitSS = totalIncSS - totalExpSS;
        const profitD = totalIncD - totalExpD;
        const isProfit = profitGC > 0 || profitSS > 0 || profitD > 0;
        const isLoss = profitGC < 0 || profitSS < 0 || profitD < 0;
        return (
          <Card>
            <SectionHeader icon={Coins} title="Monthly Financial Summary" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Total Income</div>
                <div style={{ color: 'var(--success)' }}>{totalIncGC > 0 ? `${totalIncGC}gc ` : ''}{totalIncSS > 0 ? `${totalIncSS}ss ` : ''}{totalIncD > 0 ? `${totalIncD}d` : ''}{totalIncGC === 0 && totalIncSS === 0 && totalIncD === 0 ? '—' : ''}</div>
                {propIncGC + propIncSS + propIncD > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Properties: {propIncGC > 0 ? `${propIncGC}gc ` : ''}{propIncSS > 0 ? `${propIncSS}ss ` : ''}{propIncD > 0 ? `${propIncD}d` : ''}</div>}
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Total Expenses</div>
                <div style={{ color: 'var(--danger)' }}>{totalExpGC > 0 ? `${totalExpGC}gc ` : ''}{totalExpSS > 0 ? `${totalExpSS}ss ` : ''}{totalExpD > 0 ? `${totalExpD}d` : ''}{totalExpGC === 0 && totalExpSS === 0 && totalExpD === 0 ? '—' : ''}</div>
                {propExpGC + propExpSS + propExpD > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Properties: {propExpGC > 0 ? `${propExpGC}gc ` : ''}{propExpSS > 0 ? `${propExpSS}ss ` : ''}{propExpD > 0 ? `${propExpD}d` : ''}</div>}
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Monthly Profit</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: isProfit ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {profitGC !== 0 ? `${profitGC}gc ` : ''}{profitSS !== 0 ? `${profitSS}ss ` : ''}{profitD !== 0 ? `${profitD}d` : ''}{profitGC === 0 && profitSS === 0 && profitD === 0 ? '—' : ''}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Financial Ledger */}
      <Card>
        <SectionHeader icon={Coins} title="Financial Ledger" />
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {[{ t: 'Income', color: 'var(--success)' }, { t: 'Expense', color: 'var(--danger)' }, { t: 'Event', color: 'var(--accent-gold)' }].map((b) => (
            <button key={b.t} type="button" onClick={() => setLedgerType(ledgerType === b.t ? null : b.t)} style={{ ...smallBtn, flex: 1, color: b.color, border: `1px solid ${b.color}`, opacity: ledgerType === b.t ? 1 : 0.6 }}>+ {b.t}</button>
          ))}
        </div>
        {ledgerType && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-gold)', letterSpacing: '1px', width: '55px', textTransform: 'uppercase' }}>{ledgerType}</span>
            <input value={ledgerDesc} onChange={(e) => setLedgerDesc(e.target.value)} placeholder="Description..." onKeyDown={(e) => { if (e.key === 'Enter') addLedgerEntry(); }} style={{ flex: 2, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 8px', fontSize: '13px' }} />
            <input value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} placeholder="Amount (e.g. 5gc)" onKeyDown={(e) => { if (e.key === 'Enter') addLedgerEntry(); }} style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '5px 8px', fontSize: '13px' }} />
            <button type="button" onClick={addLedgerEntry} style={{ ...smallBtn, background: 'rgba(90,154,90,0.2)', border: '1px solid var(--success)', color: 'var(--success)' }}>Add</button>
            <button type="button" onClick={() => setLedgerType(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>✕</button>
          </div>
        )}
        <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '5px' }}>
          {est.ledger.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '12px', textAlign: 'center', fontStyle: 'italic', fontSize: '12px' }}>No ledger entries yet.</p>
          ) : est.ledger.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 12px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '1px', color: entry.type === 'Income' || entry.type === 'Monthly' ? 'var(--success)' : entry.type === 'Expense' ? 'var(--danger)' : 'var(--accent-gold)', width: '55px', textTransform: 'uppercase', flexShrink: 0 }}>{entry.type}</span>
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)' }}>{entry.description}</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 600, flexShrink: 0 }}>{entry.amount.gc ? `${entry.amount.gc}gc ` : ''}{entry.amount.ss ? `${entry.amount.ss}ss ` : ''}{entry.amount.d ? `${entry.amount.d}d` : ''}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(entry.timestamp).toLocaleDateString()}</span>
              <button type="button" onClick={() => { updateCharacter((c) => ({ ...c, estate: { ...c.estate, ledger: c.estate.ledger.filter((_, j) => j !== i) } })); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
            </div>
          ))}
        </div>
      </Card>

      {/* Estate Notes & Journal */}
      <Card>
        <SectionHeader icon={ScrollText} title="Estate Notes & Journal" />
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a new estate note..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }} style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px 10px', fontSize: '13px', minHeight: '40px', resize: 'vertical' }} />
          <AddButton label="Add" onClick={addNote} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(est.notes || []).map((note, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{typeof note === 'string' ? '' : ''}</span>
                <button type="button" onClick={() => { const n = [...(est.notes || [])]; n.splice(i, 1); update('estate.notes', n); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{typeof note === 'string' ? note : ''}</div>
            </div>
          ))}
          {(est.notes || []).length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', fontSize: '12px', padding: '8px' }}>No estate notes yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
