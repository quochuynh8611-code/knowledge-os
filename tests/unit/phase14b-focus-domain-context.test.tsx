import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { FOCUS_DOMAIN_STORAGE_KEY } from '../../src/lib/storage';

function TestConsumer({ onState }: { onState: (ctx: ReturnType<typeof useData>) => void }) {
  const data = useData();
  React.useEffect(() => {
    onState(data);
  }, [data, onState]);

  return (
    <div>
      <div data-testid="focus-id">{data.focusDomainId || 'none'}</div>
      <button
        data-testid="set-phat-hoc-btn"
        onClick={() => data.setFocusDomainId('cat-root-phat-hoc')}
      >
        Set Phat Hoc
      </button>
      <button
        data-testid="set-invalid-btn"
        onClick={() => data.setFocusDomainId('invalid-domain-xyz')}
      >
        Set Invalid
      </button>
      <button
        data-testid="reset-btn"
        onClick={() => data.resetToDefaultData()}
      >
        Reset
      </button>
    </div>
  );
}

describe('Phase 14B: DataContext & Persistence Layer (Wave 14B.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Hydrates valid focusDomainId from storage on initialization', () => {
    localStorage.setItem(FOCUS_DOMAIN_STORAGE_KEY, 'cat-root-phat-hoc');

    render(
      <DataProvider>
        <TestConsumer onState={() => {}} />
      </DataProvider>
    );

    expect(screen.getByTestId('focus-id').textContent).toBe('cat-root-phat-hoc');
  });

  it('2. Persists focusDomainId to storage when setFocusDomainId is called', () => {
    render(
      <DataProvider>
        <TestConsumer onState={() => {}} />
      </DataProvider>
    );

    expect(screen.getByTestId('focus-id').textContent).toBe('none');

    act(() => {
      screen.getByTestId('set-phat-hoc-btn').click();
    });

    expect(screen.getByTestId('focus-id').textContent).toBe('cat-root-phat-hoc');
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBe('cat-root-phat-hoc');
  });

  it('3. Toggle-safe: calling setFocusDomainId with the currently active ID unpins it (sets to null)', () => {
    render(
      <DataProvider>
        <TestConsumer onState={() => {}} />
      </DataProvider>
    );

    // Set first time -> 'cat-root-phat-hoc'
    act(() => {
      screen.getByTestId('set-phat-hoc-btn').click();
    });
    expect(screen.getByTestId('focus-id').textContent).toBe('cat-root-phat-hoc');
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBe('cat-root-phat-hoc');

    // Click again -> toggle off (null)
    act(() => {
      screen.getByTestId('set-phat-hoc-btn').click();
    });
    expect(screen.getByTestId('focus-id').textContent).toBe('none');
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBeNull();
  });

  it('4. Invalid persisted domain ID automatically degrades to null', () => {
    localStorage.setItem(FOCUS_DOMAIN_STORAGE_KEY, 'non_existent_category_123');

    render(
      <DataProvider>
        <TestConsumer onState={() => {}} />
      </DataProvider>
    );

    // Post-validation effect should degrade to 'none'
    expect(screen.getByTestId('focus-id').textContent).toBe('none');
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBeNull();
  });

  it('5. resetToDefaultData cleans up both in-memory focusDomainId and persisted storage key', () => {
    localStorage.setItem(FOCUS_DOMAIN_STORAGE_KEY, 'cat-root-phat-hoc');

    render(
      <DataProvider>
        <TestConsumer onState={() => {}} />
      </DataProvider>
    );

    expect(screen.getByTestId('focus-id').textContent).toBe('cat-root-phat-hoc');

    act(() => {
      screen.getByTestId('reset-btn').click();
    });

    expect(screen.getByTestId('focus-id').textContent).toBe('none');
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBeNull();
  });
});
