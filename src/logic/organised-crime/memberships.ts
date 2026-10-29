import type { GangMembership } from '../../types/character';
import { generateUUID } from '../uuid';

/**
 * Pure add/remove/update helpers for the Organised Crime membership list
 * (Deft Steps, "Organised Crime"). React-free and immutable: every helper
 * returns a new array; the component wires them through updateCharacter.
 */

/** Clamp any organisation-level input to the 1–4 literal union. */
export function clampOrganisationLevel(level: number): 1 | 2 | 3 | 4 {
  const raw = Math.trunc(level);
  const clamped = Number.isFinite(raw) ? Math.min(4, Math.max(1, raw)) : 1;
  return clamped as 1 | 2 | 3 | 4;
}

/** Append a new membership (default name/level), returning a new array. */
export function addMembership(memberships: readonly GangMembership[]): GangMembership[] {
  const next: GangMembership = {
    id: generateUUID(),
    name: '',
    organisationLevel: 1,
  };
  return [...memberships, next];
}

/** Remove a membership by id, returning a new array. */
export function removeMembership(
  memberships: readonly GangMembership[],
  id: string,
): GangMembership[] {
  return memberships.filter((m) => m.id !== id);
}

/**
 * Update a single membership field by id, returning a new array. The
 * organisationLevel is clamped to 1–4 on write.
 */
export function updateMembership<K extends keyof GangMembership>(
  memberships: readonly GangMembership[],
  id: string,
  key: K,
  value: GangMembership[K],
): GangMembership[] {
  return memberships.map((m) => {
    if (m.id !== id) return m;
    if (key === 'organisationLevel') {
      return { ...m, organisationLevel: clampOrganisationLevel(value as number) };
    }
    return { ...m, [key]: value };
  });
}
