import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { capQuickActions, addQuickAction, MAX_QUICK_ACTIONS, type QuickActionConfig } from '../quick-actions';

// Feature: ux-improvements, Property 17: Quick actions list capped at maximum

describe('Property 17: Quick actions list capped at maximum', () => {
  /** Arbitrary for generating a single QuickActionConfig */
  const quickActionArb = fc.record({
    id: fc.uuid(),
    skillName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  });

  /** Generate arrays of quick actions of arbitrary length (0 to 20) */
  const quickActionsArrayArb = fc.array(quickActionArb, { minLength: 0, maxLength: 20 });

  it('capQuickActions never returns more than 6 items regardless of input length', () => {
    fc.assert(
      fc.property(quickActionsArrayArb, (actions) => {
        const capped = capQuickActions(actions);
        expect(capped.length).toBeLessThanOrEqual(MAX_QUICK_ACTIONS);
      }),
      { numRuns: 100 }
    );
  });

  it('capQuickActions preserves items up to the cap (first 6 items unchanged)', () => {
    fc.assert(
      fc.property(quickActionsArrayArb, (actions) => {
        const capped = capQuickActions(actions);
        const expectedLength = Math.min(actions.length, MAX_QUICK_ACTIONS);
        expect(capped.length).toBe(expectedLength);
        // The capped list is the first N items of the original
        for (let i = 0; i < capped.length; i++) {
          expect(capped[i]).toEqual(actions[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sequential addQuickAction operations never produce a list exceeding 6 items', () => {
    // Generate a sequence of actions to attempt to add (could be many more than 6)
    const addSequenceArb = fc.array(quickActionArb, { minLength: 0, maxLength: 20 });

    fc.assert(
      fc.property(addSequenceArb, (actionsToAdd) => {
        let currentList: QuickActionConfig[] = [];

        // Sequentially attempt to add each action
        for (const action of actionsToAdd) {
          currentList = addQuickAction(currentList, action);
          // Invariant: list never exceeds 6 items at any point
          expect(currentList.length).toBeLessThanOrEqual(MAX_QUICK_ACTIONS);
        }

        // Final list must also respect the cap
        expect(currentList.length).toBeLessThanOrEqual(MAX_QUICK_ACTIONS);
      }),
      { numRuns: 100 }
    );
  });

  it('addQuickAction does not add beyond cap even with unique skill names', () => {
    // Generate exactly 20 unique skill names to ensure all additions are distinct
    const uniqueSkillsArb = fc.uniqueArray(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
      { minLength: 7, maxLength: 20 }
    );

    fc.assert(
      fc.property(uniqueSkillsArb, (skills) => {
        let currentList: QuickActionConfig[] = [];

        for (const skillName of skills) {
          const action: QuickActionConfig = { id: crypto.randomUUID(), skillName };
          currentList = addQuickAction(currentList, action);
        }

        // Even with all unique skill names, list never exceeds 6
        expect(currentList.length).toBeLessThanOrEqual(MAX_QUICK_ACTIONS);
        expect(currentList.length).toBe(MAX_QUICK_ACTIONS);
      }),
      { numRuns: 100 }
    );
  });
});
