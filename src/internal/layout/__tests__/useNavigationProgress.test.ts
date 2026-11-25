// packages/ui/src/internal/layout/__tests__/useNavigationProgress.test.ts

import { act, renderHook } from '@testing-library/react';
import type { TransitionEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { useNavigationProgress } from '../useNavigationProgress';

/** A transition event of the bar root (target = currentTarget) or of its indicator. */
function transitionEvent(
  propertyName: string,
  fromIndicator = false
): TransitionEvent<HTMLElement> {
  const root = {};
  return {
    propertyName,
    currentTarget: root,
    target: fromIndicator ? {} : root,
  } as unknown as TransitionEvent<HTMLElement>;
}

describe('useNavigationProgress', () => {
  it('start → finishing → removed when the root opacity transition ends', () => {
    const { result, rerender } = renderHook(
      ({ navigating }) => useNavigationProgress(navigating),
      { initialProps: { navigating: false } }
    );
    expect(result.current.progress).toBeNull();

    rerender({ navigating: true });
    expect(result.current.progress).toEqual({ run: 1, finishing: false });

    // The fade-in ending while navigating changes nothing
    act(() => result.current.onFaded(transitionEvent('opacity')));
    expect(result.current.progress).toEqual({ run: 1, finishing: false });

    rerender({ navigating: false });
    expect(result.current.progress).toEqual({ run: 1, finishing: true });

    // Not the root's opacity: the transform completion, an indicator event
    act(() => result.current.onFaded(transitionEvent('transform')));
    act(() => result.current.onFaded(transitionEvent('opacity', true)));
    expect(result.current.progress).toEqual({ run: 1, finishing: true });

    act(() => result.current.onFaded(transitionEvent('opacity')));
    expect(result.current.progress).toBeNull();
  });

  it('a navigation during the finish mounts a fresh bar (new run)', () => {
    const { result, rerender } = renderHook(
      ({ navigating }) => useNavigationProgress(navigating),
      { initialProps: { navigating: true } }
    );
    expect(result.current.progress).toEqual({ run: 0, finishing: false });

    rerender({ navigating: false });
    expect(result.current.progress).toEqual({ run: 0, finishing: true });

    rerender({ navigating: true });
    expect(result.current.progress).toEqual({ run: 1, finishing: false });

    // The old bar's late event does not remove the new one
    act(() => result.current.onFaded(transitionEvent('opacity')));
    expect(result.current.progress).toEqual({ run: 1, finishing: false });
  });
});
