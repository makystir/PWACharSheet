import { useEffect } from 'react';

/**
 * Drop leading zeros from a number field's text: "051" → "51", "-07" → "-7",
 * "00.5" → "0.5". A lone "0" and "0.5" are left as they are.
 */
export function stripLeadingZeros(text: string): string {
  return text.replace(/^(-?)0+(?=\d)/, '$1');
}

/**
 * Number fields that fall back to 0 when cleared keep showing that 0 while the
 * player types, so typing "51" reads "051". This strips such leading zeros from
 * every number input in the app as it is typed into.
 *
 * Runs in the capture phase on `document`, before React reads the value, and
 * writes through the prototype's value setter so React's value tracking still
 * sees the keystroke as a change and every onChange handler receives the
 * cleaned text.
 */
export function useStripLeadingZeros(): void {
  useEffect(() => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

    const handleInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'number') return;
      const cleaned = stripLeadingZeros(input.value);
      if (cleaned !== input.value) setValue?.call(input, cleaned);
    };

    document.addEventListener('input', handleInput, true);
    return () => document.removeEventListener('input', handleInput, true);
  }, []);
}
