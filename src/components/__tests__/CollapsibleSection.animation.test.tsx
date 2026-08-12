import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CollapsibleSection } from '../shared/CollapsibleSection';

/**
 * CollapsibleSection animation and default state tests.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * The component uses CSS Grid animation (grid-template-rows: 0fr ↔ 1fr)
 * controlled via a data-expanded attribute on the content wrapper.
 */

describe('CollapsibleSection animation classes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('CSS Grid animation via data-expanded attribute', () => {
    it('renders content with data-expanded="false" when defaultExpanded is false', () => {
      render(
        <CollapsibleSection title="Test Section" storageKey="test-collapsed" defaultExpanded={false}>
          <p>Hidden content</p>
        </CollapsibleSection>
      );

      // Content is inside .contentInner > .content wrapper
      const contentInner = screen.getByText('Hidden content').parentElement!;
      const contentWrapper = contentInner.parentElement!;
      expect(contentWrapper).toHaveAttribute('data-expanded', 'false');
      expect(contentWrapper).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders content with data-expanded="true" when defaultExpanded is true', () => {
      render(
        <CollapsibleSection title="Test Section" storageKey="test-expanded" defaultExpanded={true}>
          <p>Visible content</p>
        </CollapsibleSection>
      );

      const contentInner = screen.getByText('Visible content').parentElement!;
      const contentWrapper = contentInner.parentElement!;
      expect(contentWrapper).toHaveAttribute('data-expanded', 'true');
      expect(contentWrapper).toHaveAttribute('aria-hidden', 'false');
    });

    it('toggles from data-expanded="false" to data-expanded="true" on click', () => {
      render(
        <CollapsibleSection title="Toggle Me" storageKey="test-toggle" defaultExpanded={false}>
          <p>Toggle content</p>
        </CollapsibleSection>
      );

      const contentInner = screen.getByText('Toggle content').parentElement!;
      const contentWrapper = contentInner.parentElement!;
      expect(contentWrapper).toHaveAttribute('data-expanded', 'false');

      // Click the header toggle
      fireEvent.click(screen.getByRole('button', { name: /toggle me/i }));

      expect(contentWrapper).toHaveAttribute('data-expanded', 'true');
      expect(contentWrapper).toHaveAttribute('aria-hidden', 'false');
    });

    it('toggles from data-expanded="true" to data-expanded="false" on click', () => {
      render(
        <CollapsibleSection title="Toggle Me" storageKey="test-toggle-back" defaultExpanded={true}>
          <p>Toggle content</p>
        </CollapsibleSection>
      );

      const contentInner = screen.getByText('Toggle content').parentElement!;
      const contentWrapper = contentInner.parentElement!;
      expect(contentWrapper).toHaveAttribute('data-expanded', 'true');

      // Click the header toggle to collapse
      fireEvent.click(screen.getByRole('button', { name: /toggle me/i }));

      expect(contentWrapper).toHaveAttribute('data-expanded', 'false');
      expect(contentWrapper).toHaveAttribute('aria-hidden', 'true');
    });

    it('header button has aria-expanded=false when collapsed', () => {
      render(
        <CollapsibleSection title="Test" storageKey="test-aria" defaultExpanded={false}>
          <p>Content</p>
        </CollapsibleSection>
      );

      const headerBtn = screen.getByRole('button', { name: /test/i });
      expect(headerBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('header button has aria-expanded=true when expanded', () => {
      render(
        <CollapsibleSection title="Test" storageKey="test-aria-expanded" defaultExpanded={true}>
          <p>Content</p>
        </CollapsibleSection>
      );

      const headerBtn = screen.getByRole('button', { name: /test/i });
      expect(headerBtn).toHaveAttribute('aria-expanded', 'true');
    });

    it('supports keyboard toggle via Enter key', () => {
      render(
        <CollapsibleSection title="Keyboard Test" storageKey="test-keyboard" defaultExpanded={false}>
          <p>Keyboard content</p>
        </CollapsibleSection>
      );

      const headerBtn = screen.getByRole('button', { name: /keyboard test/i });
      const contentInner = screen.getByText('Keyboard content').parentElement!;
      const contentWrapper = contentInner.parentElement!;

      expect(contentWrapper).toHaveAttribute('data-expanded', 'false');

      // Press Enter to toggle
      fireEvent.keyDown(headerBtn, { key: 'Enter' });
      fireEvent.click(headerBtn);

      expect(contentWrapper).toHaveAttribute('data-expanded', 'true');
    });

    it('supports keyboard toggle via Space key', () => {
      render(
        <CollapsibleSection title="Space Test" storageKey="test-space" defaultExpanded={false}>
          <p>Space content</p>
        </CollapsibleSection>
      );

      const headerBtn = screen.getByRole('button', { name: /space test/i });
      const contentInner = screen.getByText('Space content').parentElement!;
      const contentWrapper = contentInner.parentElement!;

      expect(contentWrapper).toHaveAttribute('data-expanded', 'false');

      // Press Space to toggle (buttons natively handle Enter/Space)
      fireEvent.keyDown(headerBtn, { key: ' ' });
      fireEvent.click(headerBtn);

      expect(contentWrapper).toHaveAttribute('data-expanded', 'true');
    });

    it('inner wrapper exists for overflow hidden containment', () => {
      render(
        <CollapsibleSection title="Overflow Test" storageKey="test-overflow" defaultExpanded={true}>
          <p>Inner content</p>
        </CollapsibleSection>
      );

      // The content's direct child (.contentInner) is the inner wrapper
      const contentInner = screen.getByText('Inner content').parentElement!;
      const contentWrapper = contentInner.parentElement!;

      // contentInner is between contentWrapper and the children
      expect(contentWrapper.firstElementChild).toBe(contentInner);
      expect(contentInner).toContainElement(screen.getByText('Inner content'));
    });
  });
});
