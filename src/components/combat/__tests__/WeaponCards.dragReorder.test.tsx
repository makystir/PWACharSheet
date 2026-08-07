import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeaponCards } from '../WeaponCards';
import type { Character, WeaponItem } from '../../../types/character';

/**
 * WeaponCards Drag-Reorder Integration Tests
 * **Validates: Requirements 7.1, 7.2, 7.3, 4.1**
 *
 * Tests the full drag lifecycle on WeaponCards component:
 * - pointerdown on grip → pointermove > 5px → pointerup → onReorderWeapon called
 * - Cancel via Escape mid-drag → no state mutation
 * - Card expand/collapse suppressed during drag
 */

// ─── Mock Character Factory ──────────────────────────────────────────────────

function createMockCharacter(): Character {
  const charValue = { i: 40, a: 5, b: 0 };
  return {
    _v: 7,
    name: 'Test Character',
    species: 'Human',
    class: 'Warrior',
    career: 'Soldier',
    careerLevel: '1',
    careerPath: 'Soldier',
    status: 'Silver 1',
    age: '25',
    height: '5\'10"',
    hair: 'Brown',
    eyes: 'Blue',
    chars: {
      WS: charValue,
      BS: charValue,
      S: { i: 40, a: 5, b: 0 },
      T: charValue,
      I: charValue,
      Ag: charValue,
      Dex: charValue,
      Int: charValue,
      WP: charValue,
      Fel: charValue,
    },
    charBonusOverrides: {
      WS: false, BS: false, S: false, T: false, I: false,
      Ag: false, Dex: false, Int: false, WP: false, Fel: false,
    },
    move: { m: 4, w: 8, r: 16 },
    fate: 2,
    fortune: 2,
    resilience: 2,
    resolve: 2,
    motivation: 'Test',
    speciesExtraPoints: 0,
    speciesSkills: [],
    speciesTalents: [],
    woundsUseSB: false,
    xpCur: 0,
    xpSpent: 0,
    xpTotal: 0,
    conditions: [],
    advantage: 0,
    sessionState: { inSession: false },
    combatState: { inCombat: false, initiative: 0, currentRound: 0, engaged: false, surprised: false },
    advancementLog: [],
    advancementLogArchive: [],
    sessionHistory: [],
    quickActions: [],
    criticalWounds: [],
    bSkills: [],
    aSkills: [],
    talents: [],
    ambS: '',
    ambL: '',
    partyN: '',
    partyS: '',
    partyL: '',
    partyM: '',
    psych: '',
    armour: [],
    ap: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
    trappings: [],
    wD: 0,
    wSS: 0,
    wGC: 0,
    eMax: 0,
    eMaxOverride: null,
    wSB: 4,
    wTB2: 8,
    wWPB: 4,
    wHardy: 0,
    wCur: 12,
    weapons: [],
    spells: [],
    channellingProgress: [],
    ammo: [],
    corr: 0,
    sin: 0,
    muts: '',
    mutations: [],
    companions: [],
    estate: { rank: 'none', income: 0, upkeep: 0 },
    endeavours: [],
    houseRules: {
      rangedDamageSBMode: 'none',
      impaleCritsOnTens: true,
      min1Wound: true,
      advantageCap: 10,
      useGroupAdvantage: false,
      useYenlui: false,
      useGrudgeBook: false,
      usePsychologyTracker: false,
      useCriticalDeflection: false,
      useEnterprises: false,
      useCants: false,
    },
    hirelings: [],
    log: [],
  } as unknown as Character;
}

function createMockWeapons(): WeaponItem[] {
  return [
    { name: 'Sword', group: 'Basic', enc: '1', damage: 'SB+4', qualities: 'Fast' },
    { name: 'Shield', group: 'Basic', enc: '2', damage: 'SB+2', qualities: 'Defensive, Shield 2' },
    { name: 'Longbow', group: 'Bow', enc: '2', damage: 'SB+4', qualities: '', rangeReach: '30/60' },
  ];
}

// ─── Helper: find grip elements ──────────────────────────────────────────────

function getGrips() {
  // The grip element has aria-roledescription="sortable"
  const container = document.querySelectorAll('[aria-roledescription="sortable"]');
  return Array.from(container) as HTMLElement[];
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WeaponCards drag-reorder integration', () => {
  let mockOnReorderWeapon: ReturnType<typeof vi.fn>;
  let mockOnRollWeapon: ReturnType<typeof vi.fn>;
  let mockCharacter: Character;
  let mockWeapons: WeaponItem[];

  beforeEach(() => {
    mockOnReorderWeapon = vi.fn();
    mockOnRollWeapon = vi.fn();
    mockCharacter = createMockCharacter();
    mockWeapons = createMockWeapons();
  });

  describe('Requirement 7.1: Full drag lifecycle', () => {
    it('calls onReorderWeapon with correct indices after pointerdown → pointermove → pointerup', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      const grips = getGrips();
      expect(grips.length).toBe(3);

      const firstGrip = grips[0];

      // Mock getBoundingClientRect for the container and items
      const container = firstGrip.closest('[class*="cardGrid"]') || firstGrip.closest('[data-drag-item]')?.parentElement;
      const items = document.querySelectorAll('[data-drag-item]');

      // Mock rects for items (each 50px tall, starting at y=0)
      items.forEach((item, index) => {
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
          top: index * 60,
          bottom: index * 60 + 50,
          left: 0,
          right: 300,
          width: 300,
          height: 50,
          x: 0,
          y: index * 60,
          toJSON: () => {},
        });
        // Ensure data-drag-item attribute is accessible
        (item as HTMLElement).dataset.dragItem = '';
      });

      if (container) {
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          top: 0,
          bottom: 180,
          left: 0,
          right: 300,
          width: 300,
          height: 180,
          x: 0,
          y: 0,
          toJSON: () => {},
        });
        // Mock children for the hook's rect caching
        Object.defineProperty(container, 'children', {
          get: () => items,
          configurable: true,
        });
      }

      // Step 1: pointerdown on the first grip at (100, 25)
      fireEvent.pointerDown(firstGrip, {
        pointerId: 1,
        clientX: 100,
        clientY: 25,
        button: 0,
      });

      // Step 2: pointermove > 5px (move to y=35, which is 10px down - past threshold)
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 100,
        clientY: 35,
        bubbles: true,
      });
      document.dispatchEvent(moveEvent);

      // Step 3: Continue moving down toward the second item's midpoint (y=85)
      const moveEvent2 = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 100,
        clientY: 95,
        bubbles: true,
      });
      document.dispatchEvent(moveEvent2);

      // Step 4: pointerup at the new position
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 100,
        clientY: 95,
        bubbles: true,
      });
      document.dispatchEvent(upEvent);

      // Verify onReorderWeapon was called (fromIndex: 0, toIndex: 1)
      expect(mockOnReorderWeapon).toHaveBeenCalled();
      expect(mockOnReorderWeapon).toHaveBeenCalledWith(0, 1);
    });

    it('does not call onReorderWeapon when dropped at original position', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      const grips = getGrips();
      const firstGrip = grips[0];

      const items = document.querySelectorAll('[data-drag-item]');
      items.forEach((item, index) => {
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
          top: index * 60,
          bottom: index * 60 + 50,
          left: 0,
          right: 300,
          width: 300,
          height: 50,
          x: 0,
          y: index * 60,
          toJSON: () => {},
        });
      });

      const container = items[0]?.parentElement;
      if (container) {
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          top: 0, bottom: 180, left: 0, right: 300, width: 300, height: 180, x: 0, y: 0,
          toJSON: () => {},
        });
        Object.defineProperty(container, 'children', {
          get: () => items,
          configurable: true,
        });
      }

      // pointerdown at (100, 25) — first item
      fireEvent.pointerDown(firstGrip, { pointerId: 1, clientX: 100, clientY: 25, button: 0 });

      // Move > 5px but stay in first item's region
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: 100, clientY: 36, bubbles: true,
      }));

      // pointerup at a position that still maps to index 0 (within first item)
      document.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 1, clientX: 100, clientY: 20, bubbles: true,
      }));

      // Should not call onReorderWeapon since no index change
      expect(mockOnReorderWeapon).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 4.1: Cancel via Escape mid-drag', () => {
    it('does not call onReorderWeapon when Escape is pressed during drag', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      const grips = getGrips();
      const firstGrip = grips[0];

      const items = document.querySelectorAll('[data-drag-item]');
      items.forEach((item, index) => {
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
          top: index * 60,
          bottom: index * 60 + 50,
          left: 0,
          right: 300,
          width: 300,
          height: 50,
          x: 0,
          y: index * 60,
          toJSON: () => {},
        });
      });

      const container = items[0]?.parentElement;
      if (container) {
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          top: 0, bottom: 180, left: 0, right: 300, width: 300, height: 180, x: 0, y: 0,
          toJSON: () => {},
        });
        Object.defineProperty(container, 'children', {
          get: () => items,
          configurable: true,
        });
      }

      // Start a drag
      fireEvent.pointerDown(firstGrip, { pointerId: 1, clientX: 100, clientY: 25, button: 0 });
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: 100, clientY: 36, bubbles: true,
      }));

      // Move to a different item's position
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: 100, clientY: 95, bubbles: true,
      }));

      // Press Escape to cancel
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Verify no reorder callback was triggered
      expect(mockOnReorderWeapon).not.toHaveBeenCalled();
    });

    it('returns to idle state after Escape cancellation', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      const grips = getGrips();
      const firstGrip = grips[0];

      const items = document.querySelectorAll('[data-drag-item]');
      items.forEach((item, index) => {
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
          top: index * 60, bottom: index * 60 + 50, left: 0, right: 300, width: 300, height: 50,
          x: 0, y: index * 60, toJSON: () => {},
        });
      });

      const container = items[0]?.parentElement;
      if (container) {
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          top: 0, bottom: 180, left: 0, right: 300, width: 300, height: 180, x: 0, y: 0,
          toJSON: () => {},
        });
        Object.defineProperty(container, 'children', {
          get: () => items,
          configurable: true,
        });
      }

      // Start a drag
      fireEvent.pointerDown(firstGrip, { pointerId: 1, clientX: 100, clientY: 25, button: 0 });
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: 100, clientY: 36, bubbles: true,
      }));

      // After Escape, the dragging state styles should be removed
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Verify no item has dragging class or aria-grabbed
      const draggedItems = document.querySelectorAll('[aria-grabbed="true"]');
      expect(draggedItems.length).toBe(0);
    });
  });

  describe('Requirement 7.3: Card expand/collapse suppressed during drag', () => {
    it('does not expand a card when clicking during active drag', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      const grips = getGrips();
      const firstGrip = grips[0];

      const items = document.querySelectorAll('[data-drag-item]');
      items.forEach((item, index) => {
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
          top: index * 60, bottom: index * 60 + 50, left: 0, right: 300, width: 300, height: 50,
          x: 0, y: index * 60, toJSON: () => {},
        });
      });

      const container = items[0]?.parentElement;
      if (container) {
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          top: 0, bottom: 180, left: 0, right: 300, width: 300, height: 180, x: 0, y: 0,
          toJSON: () => {},
        });
        Object.defineProperty(container, 'children', {
          get: () => items,
          configurable: true,
        });
      }

      // Start a drag (pointerdown + pointermove > 5px)
      // pointerdown sets status to 'tracking' and useEffect registers document listeners
      act(() => {
        fireEvent.pointerDown(firstGrip, { pointerId: 1, clientX: 100, clientY: 25, button: 0 });
      });

      // pointermove beyond threshold transitions to 'dragging'
      act(() => {
        document.dispatchEvent(new PointerEvent('pointermove', {
          pointerId: 1, clientX: 100, clientY: 36, bubbles: true,
        }));
      });

      // Now click on the weapon card — should NOT expand
      const weaponCard = screen.getByTestId('weapon-card-0');
      fireEvent.click(weaponCard);

      // The card should not have the expanded class
      expect(weaponCard.className).not.toContain('expanded');
    });

    it('expands a card when clicked outside of a drag operation', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      // Simply click the weapon card without any drag
      const weaponCard = screen.getByTestId('weapon-card-0');
      fireEvent.click(weaponCard);

      // The card should have the expanded class
      expect(weaponCard.className).toContain('expanded');
    });
  });

  describe('Requirement 7.2: onReorderWeapon receives correct indices', () => {
    it('correctly computes toIndex when dragging last item to first position', () => {
      render(
        <WeaponCards
          weapons={mockWeapons}
          character={mockCharacter}
          onRollWeapon={mockOnRollWeapon}
          onReorderWeapon={mockOnReorderWeapon}
        />
      );

      const grips = getGrips();
      const lastGrip = grips[2]; // Third weapon (Longbow)

      const items = document.querySelectorAll('[data-drag-item]');
      items.forEach((item, index) => {
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
          top: index * 60,
          bottom: index * 60 + 50,
          left: 0,
          right: 300,
          width: 300,
          height: 50,
          x: 0,
          y: index * 60,
          toJSON: () => {},
        });
      });

      const container = items[0]?.parentElement;
      if (container) {
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          top: 0, bottom: 180, left: 0, right: 300, width: 300, height: 180, x: 0, y: 0,
          toJSON: () => {},
        });
        Object.defineProperty(container, 'children', {
          get: () => items,
          configurable: true,
        });
      }

      // Drag last item (index 2, y starts at 145) upward
      fireEvent.pointerDown(lastGrip, { pointerId: 1, clientX: 100, clientY: 145, button: 0 });

      // Move past threshold
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: 100, clientY: 155, bubbles: true,
      }));

      // Move to above first item (y=10, which is before the first midpoint at y=25)
      document.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: 100, clientY: 10, bubbles: true,
      }));

      // Drop
      document.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 1, clientX: 100, clientY: 10, bubbles: true,
      }));

      // Should reorder from index 2 to index 0
      expect(mockOnReorderWeapon).toHaveBeenCalledWith(2, 0);
    });
  });
});
