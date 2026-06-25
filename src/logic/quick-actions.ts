/**
 * Quick actions logic module.
 * Provides pure functions for managing the quick actions list
 * with a maximum cap of 6 items (Requirement 21.3).
 */

export const MAX_QUICK_ACTIONS = 6;

export interface QuickActionConfig {
  id: string;
  skillName: string;
  icon?: string;
}

/**
 * Cap a list of quick actions to the maximum allowed (6).
 * Used by QuickActionBar to limit rendered items regardless of stored data.
 */
export function capQuickActions(actions: QuickActionConfig[]): QuickActionConfig[] {
  return actions.slice(0, MAX_QUICK_ACTIONS);
}

/**
 * Attempt to add a quick action to the list.
 * Returns the new list if the addition is valid, or the original list if:
 * - The list already has MAX_QUICK_ACTIONS items
 * - The skill is already in the list
 * - The skillName is empty
 */
export function addQuickAction(
  currentActions: QuickActionConfig[],
  newAction: QuickActionConfig
): QuickActionConfig[] {
  if (currentActions.length >= MAX_QUICK_ACTIONS) return currentActions;
  if (!newAction.skillName.trim()) return currentActions;
  if (currentActions.some(qa => qa.skillName === newAction.skillName)) return currentActions;
  return [...currentActions, newAction];
}
