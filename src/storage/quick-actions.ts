export interface QuickActionConfig {
  id: string;
  skillName: string;
  icon?: string;
}

const QUICK_ACTIONS_KEY = 'wfrp-quickActions';

export function loadQuickActions(): QuickActionConfig[] {
  try {
    return JSON.parse(localStorage.getItem(QUICK_ACTIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveQuickActions(actions: QuickActionConfig[]): void {
  try {
    localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(actions));
  } catch {
    // silently fail if localStorage is unavailable
  }
}
