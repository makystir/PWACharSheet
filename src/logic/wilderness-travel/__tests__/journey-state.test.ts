import { describe, it, expect } from 'vitest';
import {
  deriveStageCount,
  emptyJourney,
  journeyReducer,
} from '../journey-state';

describe('journeyReducer — unit', () => {
  it('createJourney coerces a negative/float planned count to a non-negative integer', () => {
    const j = journeyReducer(null, { kind: 'createJourney', name: 'Trek', plannedStages: -3 });
    expect(j).not.toBeNull();
    expect(j!.plannedStages).toBe(0);
    const j2 = journeyReducer(null, { kind: 'createJourney', name: 'Trek', plannedStages: 4.9 });
    expect(j2!.plannedStages).toBe(4);
  });

  it('non-create events on a null journey are no-ops', () => {
    expect(journeyReducer(null, { kind: 'addStage' })).toBeNull();
    expect(journeyReducer(null, { kind: 'adjustStageCount', delta: 1, reason: '' })).toBeNull();
  });

  it('addStage appends a labelled Stage; removeStage relabels', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'addStage' })!;
    j = journeyReducer(j, { kind: 'addStage' })!;
    j = journeyReducer(j, { kind: 'addStage' })!;
    expect(j.stages.map((s) => s.label)).toEqual(['1', '2', '3']);
    const midId = j.stages[1].id;
    j = journeyReducer(j, { kind: 'removeStage', stageId: midId })!;
    expect(j.stages.map((s) => s.label)).toEqual(['1', '2']);
  });

  it('setStageEndeavour creates then updates a member record and keeps the opposite slot', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'addStage' })!;
    j = journeyReducer(j, { kind: 'addRosterMember', name: 'Gerd' })!;
    const stageId = j.stages[0].id;
    const memberId = j.roster[0].id;
    j = journeyReducer(j, { kind: 'setStageEndeavour', stageId, memberId, slot: 'travel', value: 'Forage' })!;
    j = journeyReducer(j, { kind: 'setStageEndeavour', stageId, memberId, slot: 'camp', value: 'Cook' })!;
    const rec = j.stages[0].records.find((r) => r.memberId === memberId)!;
    expect(rec.travelEndeavour).toBe('Forage');
    expect(rec.campEndeavour).toBe('Cook');
  });

  it('string fields are clamped to their max lengths', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'setMeta', patch: { name: 'n'.repeat(500) } })!;
    expect(j.name.length).toBe(100);
    j = journeyReducer(j, { kind: 'addRosterMember', name: 'm'.repeat(500) })!;
    expect(j.roster[0].name.length).toBe(100);
  });

  it('deriveStageCount clamps to 0 and reports the breakdown components', () => {
    let j = emptyJourney('x', 2);
    j = journeyReducer(j, { kind: 'adjustStageCount', delta: -1, reason: 'shortcut' })!;
    j = journeyReducer(j, { kind: 'adjustStageCount', delta: -1, reason: 'shortcut 2' })!;
    j = journeyReducer(j, { kind: 'adjustStageCount', delta: -1, reason: 'shortcut 3' })!;
    const c = deriveStageCount(j);
    expect(c.planned).toBe(2);
    expect(c.adjustmentsTotal).toBe(-3);
    expect(c.total).toBe(0); // clamped
    expect(c.recordedStages).toBe(0);
  });
});
