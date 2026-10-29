import { describe, it, expect } from 'vitest';
import {
  addMembership,
  removeMembership,
  updateMembership,
  clampOrganisationLevel,
} from '../memberships';
import type { GangMembership } from '../../../types/character';

function base(): GangMembership[] {
  return [
    { id: 'a', name: 'Alpha', organisationLevel: 1 },
    { id: 'b', name: 'Beta', organisationLevel: 2 },
  ];
}

describe('addMembership', () => {
  it('appends a new membership with a generated id and default level 1', () => {
    const list = addMembership(base());
    expect(list).toHaveLength(3);
    const added = list[2];
    expect(added.id).toBeTruthy();
    expect(added.name).toBe('');
    expect(added.organisationLevel).toBe(1);
  });

  it('does not mutate the input array', () => {
    const input = base();
    addMembership(input);
    expect(input).toHaveLength(2);
  });

  it('generates unique ids across repeated adds', () => {
    const l1 = addMembership([]);
    const l2 = addMembership(l1);
    expect(l1[0].id).not.toBe(l2[1].id);
  });
});

describe('removeMembership', () => {
  it('removes the matching id', () => {
    const list = removeMembership(base(), 'a');
    expect(list.map((m) => m.id)).toEqual(['b']);
  });
  it('is a no-op for an unknown id', () => {
    expect(removeMembership(base(), 'zzz')).toHaveLength(2);
  });
});

describe('updateMembership', () => {
  it('updates a free-text field on the matching membership only', () => {
    const list = updateMembership(base(), 'a', 'name', 'Renamed');
    expect(list.find((m) => m.id === 'a')!.name).toBe('Renamed');
    expect(list.find((m) => m.id === 'b')!.name).toBe('Beta');
  });

  it('clamps organisationLevel on write', () => {
    expect(updateMembership(base(), 'a', 'organisationLevel', 9 as 1 | 2 | 3 | 4)[0].organisationLevel).toBe(4);
    expect(updateMembership(base(), 'a', 'organisationLevel', 0 as 1 | 2 | 3 | 4)[0].organisationLevel).toBe(1);
  });

  it('does not mutate the input array', () => {
    const input = base();
    updateMembership(input, 'a', 'name', 'X');
    expect(input[0].name).toBe('Alpha');
  });
});

describe('clampOrganisationLevel', () => {
  it('clamps to [1,4] and truncates', () => {
    expect(clampOrganisationLevel(0)).toBe(1);
    expect(clampOrganisationLevel(5)).toBe(4);
    expect(clampOrganisationLevel(3.9)).toBe(3);
    expect(clampOrganisationLevel(Number.NaN)).toBe(1);
  });
});
