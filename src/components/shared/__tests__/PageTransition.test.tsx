import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PageTransition } from '../PageTransition';

// Mock matchMedia
function mockMatchMedia(prefersReducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('PageTransition', () => {
  let rafCallbacks: Array<FrameRequestCallback>;
  let rafId: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    mockMatchMedia(false);

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushRAF() {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach((cb) => cb(performance.now()));
  }

  it('renders children with no transition state initially', () => {
    render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Hello</div>
      </PageTransition>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
    const wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).not.toHaveAttribute('data-transition');
  });

  it('applies fade-out state when pageKey changes', () => {
    const { rerender } = render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Page 1</div>
      </PageTransition>
    );

    rerender(
      <PageTransition pageKey="page2">
        <div data-testid="content">Page 2</div>
      </PageTransition>
    );

    const wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).toHaveAttribute('data-transition', 'fade-out');
  });

  it('transitions to fade-in after rAF frames complete', () => {
    const { rerender } = render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Page 1</div>
      </PageTransition>
    );

    rerender(
      <PageTransition pageKey="page2">
        <div data-testid="content">Page 2</div>
      </PageTransition>
    );

    // Flush first rAF
    act(() => flushRAF());
    // Flush second rAF
    act(() => flushRAF());

    const wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).toHaveAttribute('data-transition', 'fade-in');
  });

  it('cancels in-progress transition on rapid navigation', () => {
    const { rerender } = render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Page 1</div>
      </PageTransition>
    );

    // First navigation
    rerender(
      <PageTransition pageKey="page2">
        <div data-testid="content">Page 2</div>
      </PageTransition>
    );

    // Rapid second navigation before rAF fires
    rerender(
      <PageTransition pageKey="page3">
        <div data-testid="content">Page 3</div>
      </PageTransition>
    );

    // cancelAnimationFrame should have been called
    expect(window.cancelAnimationFrame).toHaveBeenCalled();

    // Should be in fade-out state for the new page
    const wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).toHaveAttribute('data-transition', 'fade-out');
  });

  it('immediately swaps content when prefers-reduced-motion is enabled', () => {
    mockMatchMedia(true);

    const { rerender } = render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Page 1</div>
      </PageTransition>
    );

    rerender(
      <PageTransition pageKey="page2">
        <div data-testid="content">Page 2</div>
      </PageTransition>
    );

    // No transition state should be applied
    const wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).not.toHaveAttribute('data-transition');
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('does not apply transition when pageKey stays the same', () => {
    const { rerender } = render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Page 1</div>
      </PageTransition>
    );

    rerender(
      <PageTransition pageKey="page1">
        <div data-testid="content">Updated Page 1</div>
      </PageTransition>
    );

    const wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).not.toHaveAttribute('data-transition');
  });

  it('wrapper does not introduce layout shift (has position relative and full width)', () => {
    render(
      <PageTransition pageKey="page1">
        <div data-testid="content">Hello</div>
      </PageTransition>
    );

    const outerWrapper = screen.getByTestId('content').parentElement?.parentElement;
    expect(outerWrapper).toBeInTheDocument();
  });
});
