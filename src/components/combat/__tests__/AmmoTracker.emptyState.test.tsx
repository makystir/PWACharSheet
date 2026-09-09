import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AmmoTracker } from '../AmmoTracker';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AmmoTracker — action-oriented empty state (Requirements 12.2, 12.3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders copy referencing adding ammunition when there is no ammo', () => {
    render(
      <AmmoTracker
        ammo={[]}
        onUpdate={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        defaultCollapsed={false}
      />,
    );

    expect(screen.getByText('No ammunition tracked')).toBeInTheDocument();
    // Description copy references adding ammunition (distinct from the action button).
    expect(screen.getByText('Add ammunition to track quantities and firing.')).toBeInTheDocument();
  });

  it('shows an "Add Ammunition" action button and invokes onAdd when clicked', () => {
    const onAdd = vi.fn();
    render(
      <AmmoTracker
        ammo={[]}
        onUpdate={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
        defaultCollapsed={false}
      />,
    );

    // The EmptyState action button (distinct from the section header "Add" button).
    const addBtn = screen.getByRole('button', { name: 'Add Ammunition' });
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('does not render the empty state when the tracker is collapsed', () => {
    render(
      <AmmoTracker
        ammo={[]}
        onUpdate={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        defaultCollapsed
      />,
    );

    expect(screen.queryByText('No ammunition tracked')).not.toBeInTheDocument();
  });
});
