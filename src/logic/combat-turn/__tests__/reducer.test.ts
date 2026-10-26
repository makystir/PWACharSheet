import { describe, it, expect } from 'vitest';
import { STEP_SEQUENCE, initialTurnState, turnReducer } from '../reducer';
import type { TurnState } from '../types';

describe('turnReducer — unit', () => {
  it('next clamps at the last step and is idempotent there', () => {
    let s = initialTurnState;
    for (let i = 0; i < 10; i++) s = turnReducer(s, { kind: 'next' });
    expect(s.step).toBe('end');
    // idempotent at the last step — returns the same reference
    const again = turnReducer(s, { kind: 'next' });
    expect(again).toBe(s);
  });

  it('back clamps at the first step and is idempotent there', () => {
    const atStart: TurnState = { ...initialTurnState, step: 'start' };
    const again = turnReducer(atStart, { kind: 'back' });
    expect(again).toBe(atStart);
    expect(again.step).toBe('start');
  });

  it('next then back round-trips from an interior step', () => {
    const atChoose: TurnState = { ...initialTurnState, step: 'choose' };
    const advanced = turnReducer(atChoose, { kind: 'next' });
    expect(advanced.step).toBe('resolve');
    const back = turnReducer(advanced, { kind: 'back' });
    expect(back.step).toBe('choose');
  });

  it('goto sets any valid step', () => {
    for (const step of STEP_SEQUENCE) {
      const s = turnReducer(initialTurnState, { kind: 'goto', step });
      expect(s.step).toBe(step);
    }
  });

  it('goto with an invalid value is a no-op (returns state unchanged)', () => {
    // @ts-expect-error — deliberately passing an out-of-range step value
    const s = turnReducer(initialTurnState, { kind: 'goto', step: 'nope' });
    expect(s).toBe(initialTurnState);
  });

  it('chooseOption sets chosenOption and advances to resolve WITHOUT setting actionUsed', () => {
    const atChoose: TurnState = { ...initialTurnState, step: 'choose' };
    const s = turnReducer(atChoose, { kind: 'chooseOption', option: 'attack' });
    expect(s.chosenOption).toBe('attack');
    expect(s.step).toBe('resolve');
    expect(s.actionUsed).toBe(false);
    expect(s.moveUsed).toBe(false);
  });

  it('markMove / markAction set the flag only and never change step', () => {
    const atResolve: TurnState = { ...initialTurnState, step: 'resolve' };
    const moved = turnReducer(atResolve, { kind: 'markMove', used: true });
    expect(moved.moveUsed).toBe(true);
    expect(moved.step).toBe('resolve');
    const acted = turnReducer(moved, { kind: 'markAction', used: true });
    expect(acted.actionUsed).toBe(true);
    expect(acted.step).toBe('resolve');
    // flags can be toggled back off
    expect(turnReducer(acted, { kind: 'markAction', used: false }).actionUsed).toBe(false);
  });

  it('reset returns a fresh initialTurnState from any state', () => {
    const dirty: TurnState = { step: 'end', moveUsed: true, actionUsed: true, chosenOption: 'cast' };
    const s = turnReducer(dirty, { kind: 'reset' });
    expect(s).toEqual(initialTurnState);
    // fresh object, not the shared constant
    expect(s).not.toBe(initialTurnState);
  });
});
