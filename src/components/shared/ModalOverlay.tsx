import type { ComponentPropsWithRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './styles/shared.module.css';

export type ModalOverlayProps = ComponentPropsWithRef<'div'>;

/**
 * Full-screen modal backdrop rendered into `document.body`.
 *
 * Overlays are `position: fixed`, but any ancestor with a `transform` (card
 * hover lift, entrance animation, old-guy `#root` scale) becomes their
 * containing block, so a nested modal centers on that ancestor instead of the
 * viewport. Portaling out of the tree keeps it pinned to the screen.
 *
 * Accepts any `<div>` props; `className` replaces the shared `.overlay` style.
 */
export function ModalOverlay({ className = styles.overlay, ...rest }: ModalOverlayProps) {
  return createPortal(<div data-modal-overlay="" className={className} {...rest} />, document.body);
}
