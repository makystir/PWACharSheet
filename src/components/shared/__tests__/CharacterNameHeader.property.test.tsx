import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { CharacterNameHeader } from '../CharacterNameHeader';

// Mock CSS modules
vi.mock('../CharacterNameHeader.module.css', () => ({
  default: {
    header: 'header',
    name: 'name',
    chevron: 'chevron',
  },
}));

// Mock lucide-react ChevronDown
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className, ...props }: Record<string, unknown>) => (
    <svg data-testid="chevron-icon" className={className as string} {...props} />
  ),
}));

describe('CharacterNameHeader Property Tests', () => {
  /**
   * Feature: mobile-character-management, Property 1: Empty or whitespace-only names display fallback text
   * **Validates: Requirements 1.7**
   */
  describe('Property 1: Empty or whitespace-only names display fallback text', () => {
    it('displays "Unnamed Character" for any whitespace-only or empty string', () => {
      const onOpen = vi.fn();

      // Generate strings composed only of whitespace characters
      const whitespaceArb = fc
        .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 0, maxLength: 20 })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(whitespaceArb, (whitespaceStr) => {
          cleanup();
          render(
            <CharacterNameHeader characterName={whitespaceStr} onOpen={onOpen} />
          );

          const nameElement = screen.getByText('Unnamed Character');
          expect(nameElement).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    it('displays the actual name for any string with at least one non-whitespace character', () => {
      const onOpen = vi.fn();

      // Generate strings that contain at least one non-whitespace character
      const nonWhitespaceString = fc
        .tuple(
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 1 }).filter((c) => c.trim().length > 0),
          fc.string({ minLength: 0, maxLength: 10 })
        )
        .map(([prefix, nonWs, suffix]) => prefix + nonWs + suffix);

      fc.assert(
        fc.property(nonWhitespaceString, (name) => {
          cleanup();
          render(
            <CharacterNameHeader characterName={name} onOpen={onOpen} />
          );

          // Should display the actual name, not the fallback
          expect(screen.queryByText('Unnamed Character')).not.toBeInTheDocument();
          // Use the container to verify the name is present in the name span
          const nameSpan = document.querySelector('.name');
          expect(nameSpan).not.toBeNull();
          expect(nameSpan!.textContent).toBe(name);
        }),
        { numRuns: 100 }
      );
    });
  });
});
