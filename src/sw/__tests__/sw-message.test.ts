import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleMessage } from '../message';

describe('handleMessage', () => {
  let originalSelf: unknown;
  let skipWaitingFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalSelf = (globalThis as Record<string, unknown>).self;
    skipWaitingFn = vi.fn();
    (globalThis as Record<string, unknown>).self = {
      skipWaiting: skipWaitingFn,
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).self = originalSelf;
    vi.restoreAllMocks();
  });

  function createMessageEvent(data: unknown): ExtendableMessageEvent {
    return { data } as unknown as ExtendableMessageEvent;
  }

  it('calls self.skipWaiting() when receiving SKIP_WAITING message', () => {
    const event = createMessageEvent({ type: 'SKIP_WAITING' });

    handleMessage(event);

    expect(skipWaitingFn).toHaveBeenCalledTimes(1);
  });

  it('does not call self.skipWaiting() for unrecognized message types', () => {
    const event = createMessageEvent({ type: 'UNKNOWN_TYPE' });

    handleMessage(event);

    expect(skipWaitingFn).not.toHaveBeenCalled();
  });

  it('does not call self.skipWaiting() when data is null', () => {
    const event = createMessageEvent(null);

    handleMessage(event);

    expect(skipWaitingFn).not.toHaveBeenCalled();
  });

  it('does not call self.skipWaiting() when data is undefined', () => {
    const event = createMessageEvent(undefined);

    handleMessage(event);

    expect(skipWaitingFn).not.toHaveBeenCalled();
  });

  it('does not call self.skipWaiting() when data has no type property', () => {
    const event = createMessageEvent({ payload: 'something' });

    handleMessage(event);

    expect(skipWaitingFn).not.toHaveBeenCalled();
  });
});
