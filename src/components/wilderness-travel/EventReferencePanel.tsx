import { AlertTriangle } from 'lucide-react';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import {
  EVENT_TABLES,
  EVENT_TRIGGER_RULE,
  EVENT_TRIGGER_THRESHOLD,
} from '../../logic/wilderness-travel/journey-events';
import styles from './JourneyTrackerPanel.module.css';

/**
 * Slice C — browsable reference view of the four Wilderness Travel Event tables
 * (Deft Steps pp.116–117), with the trigger rule transcribed verbatim. All rows
 * are visible/browsable and labelled with their terrain applicability. Pure
 * display: nothing is rolled or applied here (the roll helper lives per-Stage in
 * StageCard). Transcription is verbatim from the cited pages — nothing invented.
 */
export function EventReferencePanel() {
  return (
    <Card>
      <SectionHeader icon={AlertTriangle} title="Wilderness Travel Events (Reference)" />
      <p className={styles.guidance}>
        {/* Deft Steps p.116: verbatim trigger rule. */}
        Deft Steps p.116: &ldquo;{EVENT_TRIGGER_RULE}&rdquo; A result of {EVENT_TRIGGER_THRESHOLD} or more on
        the 1D10 triggers an event. As with regular Travel Events it is up to the GM to decide whether
        the event actually occurs &mdash; these tables are reference only; nothing is applied automatically.
      </p>

      {EVENT_TABLES.map((table) => (
        <div key={table.id} className={styles.eventTable}>
          <h4 className={styles.eventTableName}>{table.name}</h4>
          <p className={styles.eventTableMeta}>
            Applies to: {table.terrains.join(', ')} &middot; Deft Steps p.{table.page}
          </p>
          <div className={styles.eventRows}>
            {table.rows.map((row) => (
              <div key={`${table.id}-${row.min}`} className={styles.eventRow}>
                <span className={styles.eventRoll}>
                  {row.min === row.max ? row.min : `${row.min}–${row.max}`}
                </span>
                <span className={row.redirectToTable1 ? styles.eventRedirect : styles.eventResult}>
                  {row.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

export default EventReferencePanel;
