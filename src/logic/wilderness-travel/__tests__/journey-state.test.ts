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

  it('setMemberPlanningSL coerces to a non-negative int; NaN and unknown member are no-ops', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'addRosterMember', name: 'Gerd' })!;
    const memberId = j.roster[0].id;
    j = journeyReducer(j, { kind: 'setMemberPlanningSL', memberId, planningSL: 3.9 })!;
    expect(j.roster[0].planningSL).toBe(3);
    j = journeyReducer(j, { kind: 'setMemberPlanningSL', memberId, planningSL: -5 })!;
    expect(j.roster[0].planningSL).toBe(0);
    // NaN → keep prior value.
    j = journeyReducer(j, { kind: 'setMemberPlanningSL', memberId, planningSL: NaN })!;
    expect(j.roster[0].planningSL).toBe(0);
    // Unknown member → unchanged identity (no-op).
    const before = j;
    const after = journeyReducer(j, { kind: 'setMemberPlanningSL', memberId: 'missing', planningSL: 9 });
    expect(after).toBe(before);
  });

  it('setStageTerrain accepts valid terrain and clears/ignores invalid values', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'addStage' })!;
    const stageId = j.stages[0].id;
    j = journeyReducer(j, { kind: 'setStageTerrain', stageId, terrain: 'Mountains' })!;
    expect(j.stages[0].terrain).toBe('Mountains');
    // Invalid value → selection cleared.
    j = journeyReducer(j, { kind: 'setStageTerrain', stageId, terrain: 'Bogus' as never })!;
    expect(j.stages[0].terrain).toBeUndefined();
    // Explicit undefined → cleared.
    j = journeyReducer(j, { kind: 'setStageTerrain', stageId, terrain: 'Hills' })!;
    j = journeyReducer(j, { kind: 'setStageTerrain', stageId, terrain: undefined })!;
    expect(j.stages[0].terrain).toBeUndefined();
    // Unknown stage → no-op.
    const before = j;
    expect(journeyReducer(j, { kind: 'setStageTerrain', stageId: 'missing', terrain: 'Hills' })).toBe(before);
  });

  it('setStageWeather keeps only recognised category literals; all-empty drops the field', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'addStage' })!;
    const stageId = j.stages[0].id;
    j = journeyReducer(j, {
      kind: 'setStageWeather',
      stageId,
      weather: { temperature: 'Bitter', precipitation: 'Bogus' as never, visibility: 'Fog' },
    })!;
    expect(j.stages[0].weather).toEqual({ temperature: 'Bitter', visibility: 'Fog' });
    // All-invalid/empty → weather field removed.
    j = journeyReducer(j, { kind: 'setStageWeather', stageId, weather: {} })!;
    expect(j.stages[0].weather).toBeUndefined();
  });

  it('setJourneyTents coerces to a strict boolean', () => {
    let j = emptyJourney('x', 0);
    j = journeyReducer(j, { kind: 'setJourneyTents', hasTents: true })!;
    expect(j.hasTents).toBe(true);
    j = journeyReducer(j, { kind: 'setJourneyTents', hasTents: false })!;
    expect(j.hasTents).toBe(false);
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
