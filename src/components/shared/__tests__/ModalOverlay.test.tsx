import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModalOverlay } from '../ModalOverlay';

vi.mock('../styles/shared.module.css', () => ({
  default: { overlay: 'sharedOverlay' },
}));

describe('ModalOverlay', () => {
  it('portals into document.body so transformed ancestors cannot contain it', () => {
    const { container } = render(
      <div style={{ transform: 'translateY(0)' }}>
        <ModalOverlay role="dialog" aria-label="Test">
          <p>content</p>
        </ModalOverlay>
      </div>,
    );

    const overlay = screen.getByRole('dialog', { name: 'Test' });
    expect(container.contains(overlay)).toBe(false);
    expect(overlay.parentElement).toBe(document.body);
    expect(overlay).toHaveTextContent('content');
  });

  it('uses the shared overlay class by default and lets className replace it', () => {
    const { rerender } = render(<ModalOverlay data-testid="overlay" />);
    expect(screen.getByTestId('overlay')).toHaveClass('sharedOverlay');

    rerender(<ModalOverlay data-testid="overlay" className="custom" />);
    expect(screen.getByTestId('overlay')).toHaveClass('custom');
    expect(screen.getByTestId('overlay')).not.toHaveClass('sharedOverlay');
  });

  it('marks itself with data-modal-overlay for theme scaling', () => {
    render(<ModalOverlay data-testid="overlay" />);
    expect(screen.getByTestId('overlay')).toHaveAttribute('data-modal-overlay');
  });

  it('forwards ref and event handlers to the overlay element', () => {
    const ref = createRef<HTMLDivElement>();
    const onClick = vi.fn();
    render(<ModalOverlay ref={ref} data-testid="overlay" onClick={onClick} />);

    const overlay = screen.getByTestId('overlay');
    expect(ref.current).toBe(overlay);
    fireEvent.click(overlay);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('removes the overlay from document.body on unmount', () => {
    const { unmount } = render(<ModalOverlay data-testid="overlay" />);
    unmount();
    expect(document.querySelector('[data-modal-overlay]')).toBeNull();
  });
});
