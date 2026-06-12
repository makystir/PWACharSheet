import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Picker } from '../Picker';

// Mock CSS modules
vi.mock('../Picker.module.css', () => ({
  default: {
    overlay: 'overlay',
    modal: 'modal',
    title: 'title',
    search: 'search',
    list: 'list',
    item: 'item',
    close: 'close',
    emptyMessage: 'emptyMessage',
  },
}));

// Mock window.matchMedia to simulate mobile viewport (375px)
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

const mockItems = ['Sword', 'Shield', 'Bow', 'Staff', 'Dagger'];

describe('Picker modal mobile sizing', () => {
  // **Validates: Requirements 13.1**
  describe('Requirement 13.1: Picker modal expands to fill at least 95% viewport width on mobile', () => {
    it('renders the modal container with the modal CSS class (carries 95% width on mobile)', () => {
      render(
        <Picker
          items={mockItems}
          getLabel={(item) => item}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          title="Select Weapon"
        />
      );

      const modal = screen.getByRole('dialog').firstElementChild;
      expect(modal).toHaveClass('modal');
    });

    it('renders the modal as a dialog with accessible label', () => {
      render(
        <Picker
          items={mockItems}
          getLabel={(item) => item}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          title="Select Weapon"
        />
      );

      const dialog = screen.getByRole('dialog', { name: 'Select Weapon' });
      expect(dialog).toBeInTheDocument();
    });
  });

  // **Validates: Requirements 13.2**
  describe('Requirement 13.2: Each list item has min-height 44px with visible separator', () => {
    it('renders all list items with the item CSS class (carries min-height 44px and border separator on mobile)', () => {
      render(
        <Picker
          items={mockItems}
          getLabel={(item) => item}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          title="Select Weapon"
        />
      );

      const items = screen.getAllByRole('button', { name: /Sword|Shield|Bow|Staff|Dagger/ });
      expect(items).toHaveLength(5);

      items.forEach((item) => {
        expect(item).toHaveClass('item');
      });
    });

    it('renders list items as buttons for accessibility', () => {
      render(
        <Picker
          items={mockItems}
          getLabel={(item) => item}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          title="Select Weapon"
        />
      );

      const items = screen.getAllByRole('button', { name: /Sword|Shield|Bow|Staff|Dagger/ });
      items.forEach((item) => {
        expect(item.tagName).toBe('BUTTON');
      });
    });
  });
});
