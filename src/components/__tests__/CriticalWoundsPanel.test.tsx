import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CriticalWoundsPanel } from '../combat/CriticalWoundsPanel';
import type { CriticalWound } from '../../types/character';

const makeWound = (overrides: Partial<CriticalWound> = {}): CriticalWound => ({
  id: 1,
  timestamp: 1000,
  location: 'Body',
  description: 'Broken rib',
  effects: '-10 Agility',
  duration: 'Until healed',
  severity: 2,
  healed: false,
  ...overrides,
});

describe('CriticalWoundsPanel', () => {
  it('renders empty state when no active critical wounds', () => {
    render(
      <CriticalWoundsPanel
        criticalWounds={[]}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText('No active critical wounds')).toBeInTheDocument();
  });

  it('renders empty state when all wounds are healed', () => {
    const wounds = [makeWound({ healed: true })];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText('No active critical wounds')).toBeInTheDocument();
  });

  it('renders active wound with location and description', () => {
    const wounds = [makeWound({ location: 'Head', description: 'Cracked skull' })];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    // Location appears in header and editable field
    expect(screen.getAllByText('Head').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cracked skull').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onAdd when Add button is clicked', () => {
    const onAdd = vi.fn();
    render(
      <CriticalWoundsPanel
        criticalWounds={[]}
        onAdd={onAdd}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Add'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onHeal with wound id when Heal button is clicked', () => {
    const onHeal = vi.fn();
    const wounds = [makeWound({ id: 42 })];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={onHeal}
        onUpdate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Heal'));
    expect(onHeal).toHaveBeenCalledWith(42);
  });

  it('renders severity badge with correct value', () => {
    const wounds = [makeWound({ severity: 3 })];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    // Severity appears in badge and editable field
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders editable fields for location, description, effects, duration, severity', () => {
    const wounds = [makeWound({
      location: 'Left Arm',
      description: 'Deep gash',
      effects: '-10 WS',
      duration: '3 days',
      severity: 1,
    })];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Effects')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
  });

  it('calls onUpdate when an editable field is saved', () => {
    const onUpdate = vi.fn();
    const wounds = [makeWound({ location: 'Body', effects: 'Winded' })];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={onUpdate}
      />,
    );
    // Click the effects display value to enter edit mode (unique text)
    const effectsDisplay = screen.getByText('Winded');
    fireEvent.click(effectsDisplay);
    const input = screen.getByDisplayValue('Winded');
    fireEvent.change(input, { target: { value: 'Stunned' } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith(0, 'effects', 'Stunned');
  });

  it('renders multiple active wounds', () => {
    const wounds = [
      makeWound({ id: 1, location: 'Head', description: 'Cracked skull' }),
      makeWound({ id: 2, location: 'Left Leg', description: 'Torn muscle' }),
    ];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    // Both wounds should be present (use getAllByText since text appears in header + editable field)
    expect(screen.getAllByText('Head').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cracked skull').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Left Leg').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Torn muscle').length).toBeGreaterThanOrEqual(1);
  });

  it('only renders unhealed wounds', () => {
    const wounds = [
      makeWound({ id: 1, location: 'Head', description: 'Cracked skull', healed: false }),
      makeWound({ id: 2, location: 'Right Arm', description: 'Old scar', healed: true }),
    ];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Head').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cracked skull').length).toBeGreaterThanOrEqual(1);
    // The healed wound's description should not appear
    expect(screen.queryByText('Old scar')).not.toBeInTheDocument();
  });

  it('passes correct index for onUpdate when wound is not first in array', () => {
    const onUpdate = vi.fn();
    const wounds = [
      makeWound({ id: 1, location: 'Head', healed: true }),
      makeWound({ id: 2, location: 'Left Arm', description: 'Sprain', effects: 'Numbness', healed: false }),
    ];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={onUpdate}
      />,
    );
    // Click the effects display to edit (unique text)
    const effectsDisplay = screen.getByText('Numbness');
    fireEvent.click(effectsDisplay);
    const input = screen.getByDisplayValue('Numbness');
    fireEvent.change(input, { target: { value: 'Tingling' } });
    fireEvent.blur(input);
    // Should pass index 1 (position in the full criticalWounds array)
    expect(onUpdate).toHaveBeenCalledWith(1, 'effects', 'Tingling');
  });

  it('Heal button meets 44px minimum tap target', () => {
    const wounds = [makeWound()];
    render(
      <CriticalWoundsPanel
        criticalWounds={wounds}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    const healBtn = screen.getByText('Heal');
    expect(healBtn.style.minWidth).toBe('44px');
    expect(healBtn.style.minHeight).toBe('44px');
  });
});
