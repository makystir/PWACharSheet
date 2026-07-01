import type { SkipWaitingMessage } from './types';

/**
 * Handles messages sent to the service worker via postMessage.
 * Call `self.skipWaiting()` when a SKIP_WAITING message is received.
 */
export function handleMessage(event: ExtendableMessageEvent): void {
  const data = event.data as SkipWaitingMessage | undefined;
  if (data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}
