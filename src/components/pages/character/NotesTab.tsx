import type { Character, FieldPath, FieldValue } from '../../../types/character';
import type { RollResult } from '../../../logic/dice-roller';
import { Card } from '../../shared/Card';
import { SectionHeader } from '../../shared/SectionHeader';
import { EditableField } from '../../shared/EditableField';
import { CollapsibleSection } from '../../shared/CollapsibleSection';
import { CorruptionCard } from '../../shared/CorruptionCard';
import { DiseasePanel } from '../../shared/DiseasePanel';
import { SessionNotesPanel } from '../../shared/SessionNotesPanel';
import { TimelineView } from '../../shared/TimelineView';
import { clearEventLog } from '../../../logic/event-log';
import { BookOpen } from 'lucide-react';
// Import the SAME stylesheet as the CharacterPage shell so class names stay
// byte-identical after extraction (spec: character-page-decomposition, Req 3.3).
import styles from '../CharacterPage.module.css';

interface NotesTabProps {
  character: Character;
  /** Typed single-field update, unchanged from CharacterPageProps (Req 6.1, 6.2). */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /** Optional callback so disease Tests can be recorded in the shared roll history. */
  addRoll?: (result: RollResult) => void;
}

/**
 * Notes Sub_Tab content extracted verbatim from CharacterPage
 * (spec: character-page-decomposition, seam g — Req 2.1): Ambitions & Party +
 * Corruption & Mutation + Diseases + Session Notes + Timeline (event log).
 *
 * Behaviour-preserving: DOM structure, ARIA, and CSS module classes are
 * identical to the pre-refactor inline blocks (Req 3.1, 3.2, 3.3). No
 * Lifted_State is owned here; the unit reads/writes through the typed
 * `update`/`updateCharacter` surface only (Req 6.1, 6.2) and threads `addRoll`
 * into the DiseasePanel exactly as the shell did. The `activeSubTab === 'notes'`
 * wrapper and its `mobileHidden` toggle remain in the shell (Req 5.1).
 */
export function NotesTab({ character, update, updateCharacter, addRoll }: NotesTabProps) {
  return (
    <>
      {/* Ambitions & Party */}
      <Card>
        <div className={styles.ambitionsGrid}>
          <div>
            <SectionHeader icon={BookOpen} title="Ambitions" />
            <EditableField label="Short-term" value={character.ambS} onSave={(v) => update('ambS', String(v))} />
            <EditableField label="Long-term" value={character.ambL} onSave={(v) => update('ambL', String(v))} />
          </div>
          <div>
            <SectionHeader icon={BookOpen} title="Party" />
            <EditableField label="Name" value={character.partyN} onSave={(v) => update('partyN', String(v))} />
            <EditableField label="Members" value={character.partyM} onSave={(v) => update('partyM', String(v))} />
          </div>
        </div>
      </Card>

      {/* Corruption & Mutation */}
      <CorruptionCard character={character} update={update} updateCharacter={updateCharacter} onRoll={addRoll} />

      {/* Diseases */}
      <DiseasePanel character={character} updateCharacter={updateCharacter} onRoll={addRoll} />

      {/* Session Notes */}
      <SessionNotesPanel character={character} updateCharacter={updateCharacter} />

      {/* Timeline — minimal standalone entry point for the unified event log (unified-event-log spec §5) */}
      <CollapsibleSection title="Timeline" storageKey="collapsible-timeline" defaultExpanded={false}>
        <TimelineView
          events={character.eventLog ?? []}
          onClear={() => updateCharacter((c) => clearEventLog(c))}
        />
      </CollapsibleSection>
    </>
  );
}
