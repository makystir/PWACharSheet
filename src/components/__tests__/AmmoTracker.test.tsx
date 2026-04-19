import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AmmoTracker } from '../combat/AmmoTracker';
import type { AmmoItem } from '../../types/character';

const makeAmmo = (overrides: Partial<AmmoItem> = {}): AmmoItem => ({
  name: 'Arrows',
  quantity: 10,
  max: 12,
  enc: '0',
  qualities: '',
  ...overrides,
});

describe('AmmoTracker', () => {
  it('renders empty state when no ammo items', () => {
    render(<AmmoTracker ammo={[]} onUpdate={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('No ammunition tracked')).toBeInTheDocument();
  });

  it('renders ammo item with name and quantity', () => {
    const ammo = [makeAmmo({ name: 'Bolts', quantity: 8, max: 20 })];
    render(<AmmoTracker ammo={ammo} onUpdate={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Bolts')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('calls onAdd when Add button is clicked', () => {
    const onAdd = vi.fn();
    render(<AmmoTracker ammo={[]} onUpdate={onAdd} onAdd={onAdd} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('Add'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove with correct index when delete button is clicked', () => {
    const onRemove = vi.fn();
    const ammo = [makeAmmo({ name: 'Arrows' }), makeAmmo({ name: 'Bolts' })];
    render(<AmmoTracker ammo={ammo} onUpdate={vi.fn()} onAdd={vi.fn()} onRemove={onRemove} />);
    const deleteButtons = screen.getAllByText('✕');
    fireEvent.click(deleteButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('FIRE button decrements quantity via onUpdate', () => {
    const onUpdate = vi.fn();
    const ammo = [makeAmmo({ quantity: 5, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={onUpdate} onAdd={vi.fn()} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('FIRE'));
    expect(onUpdate).toHaveBeenCalledWith(0, 'quantity', 4);
  });

  it('FIRE button does not decrement below 0', () => {
    const onUpdate = vi.fn();
    const ammo = [makeAmmo({ quantity: 0, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={onUpdate} onAdd={vi.fn()} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('FIRE'));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('+1 button increments quantity via onUpdate', () => {
    const onUpdate = vi.fn();
    const ammo = [makeAmmo({ quantity: 5, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={onUpdate} onAdd={vi.fn()} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('+1'));
    expect(onUpdate).toHaveBeenCalledWith(0, 'quantity', 6);
  });

  it('+1 button does not increment above max', () => {
    const onUpdate = vi.fn();
    const ammo = [makeAmmo({ quantity: 12, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={onUpdate} onAdd={vi.fn()} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('+1'));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('REFILL button sets quantity to max via onUpdate', () => {
    const onUpdate = vi.fn();
    const ammo = [makeAmmo({ quantity: 3, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={onUpdate} onAdd={vi.fn()} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('REFILL'));
    expect(onUpdate).toHaveBeenCalledWith(0, 'quantity', 12);
  });

  it('shows low-ammo class when quantity is 3 or less', () => {
    const ammo = [makeAmmo({ quantity: 2, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />);
    const quantityEl = screen.getByText('2');
    expect(quantityEl.className).toContain('ammoCountLow');
  });

  it('shows normal-ammo class when quantity is above 3', () => {
    const ammo = [makeAmmo({ quantity: 8, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />);
    const quantityEl = screen.getByText('8');
    expect(quantityEl.className).toContain('ammoCountNormal');
  });

  it('renders multiple ammo items', () => {
    const ammo = [
      makeAmmo({ name: 'Arrows', quantity: 10, max: 20 }),
      makeAmmo({ name: 'Bolts', quantity: 5, max: 10 }),
    ];
    render(<AmmoTracker ammo={ammo} onUpdate={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Arrows')).toBeInTheDocument();
    expect(screen.getByText('Bolts')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('editable max field calls onUpdate with new max value', () => {
    const onUpdate = vi.fn();
    const ammo = [makeAmmo({ quantity: 5, max: 12 })];
    render(<AmmoTracker ammo={ammo} onUpdate={onUpdate} onAdd={vi.fn()} onRemove={vi.fn()} />);
    const maxInput = screen.getByDisplayValue('12');
    fireEvent.change(maxInput, { target: { value: '20' } });
    expect(onUpdate).toHaveBeenCalledWith(0, 'max', 20);
  });
});
