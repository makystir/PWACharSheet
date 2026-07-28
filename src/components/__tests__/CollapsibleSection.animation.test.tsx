import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CollapsibleSection } from '../shared/CollapsibleSection';

/**
 * CollapsibleSection animation and default state tests.
 * Validates: Requirements 2.4, 1.2, 6.1, 5.4
 */

describe('CollapsibleSection animation classes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Requirement 2.4: Animate expand/collapse with 150ms ease-out CSS transition on max-height', () => {
    it('renders content with contentCollapsed class when defaultExpanded is false', () => {
      render(
        <CollapsibleSection title="Test Section" storageKey="test-collapsed" defaultExpanded={false}>
          <p>Hidden content</p>
        </CollapsibleSection>
      );

      const content = screen.getByText('Hidden content').parentElement!;
      expect(content.className).toContain('contentCollapsed');
      expect(content.className).not.toContain('contentExpanded');
      expect(content).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders content with contentExpanded class when defaultExpanded is true', () => {
      render(
        <CollapsibleSection title="Test Section" storageKey="test-expanded" defaultExpanded={true}>
          <p>Visible content</p>
        </CollapsibleSection>
      );

      const content = screen.getByText('Visible content').parentElement!;
      expect(content.className).toContain('contentExpanded');
      expect(content.className).not.toContain('contentCollapsed');
      expect(content).toHaveAttribute('aria-hidden', 'false');
    });

    it('toggles from contentCollapsed to contentExpanded on click', () => {
      render(
        <CollapsibleSection title="Toggle Me" storageKey="test-toggle" defaultExpanded={false}>
          <p>Toggle content</p>
        </CollapsibleSection>
      );

      const content = screen.getByText('Toggle content').parentElement!;
      expect(content.className).toContain('contentCollapsed');

      // Click the header toggle
      fireEvent.click(screen.getByRole('button', { name: /toggle me/i }));

      expect(content.className).toContain('contentExpanded');
      expect(content.className).not.toContain('contentCollapsed');
      expect(content).toHaveAttribute('aria-hidden', 'false');
    });

    it('toggles from contentExpanded to contentCollapsed on click', () => {
      render(
        <CollapsibleSection title="Toggle Me" storageKey="test-toggle-back" defaultExpanded={true}>
          <p>Toggle content</p>
        </CollapsibleSection>
      );

      const content = screen.getByText('Toggle content').parentElement!;
      expect(content.className).toContain('contentExpanded');

      // Click the header toggle to collapse
      fireEvent.click(screen.getByRole('button', { name: /toggle me/i }));

      expect(content.className).toContain('contentCollapsed');
      expect(content.className).not.toContain('contentExpanded');
      expect(content).toHaveAttribute('aria-hidden', 'true');
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
  });
});
