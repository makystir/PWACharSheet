import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CommandPaletteProvider, useCommandPaletteContext } from '../CommandPaletteContext';

describe('CommandPaletteContext', () => {
  it('throws when useCommandPaletteContext is used outside provider', () => {
    expect(() => {
      renderHook(() => useCommandPaletteContext());
    }).toThrow('useCommandPaletteContext must be used within a CommandPaletteProvider');
  });

  it('provides isOpen as false initially', () => {
    const { result } = renderHook(() => useCommandPaletteContext(), {
      wrapper: CommandPaletteProvider,
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('open() sets isOpen to true', () => {
    const { result } = renderHook(() => useCommandPaletteContext(), {
      wrapper: CommandPaletteProvider,
    });
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('close() sets isOpen to false', () => {
    const { result } = renderHook(() => useCommandPaletteContext(), {
      wrapper: CommandPaletteProvider,
    });
    act(() => result.current.open());
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggle() flips isOpen state', () => {
    const { result } = renderHook(() => useCommandPaletteContext(), {
      wrapper: CommandPaletteProvider,
    });
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });
});
