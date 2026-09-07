import React, { useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFocusTrap, getFocusableElements } from '../../src/hooks/useFocusTrap';

function TestModal({
  isOpen,
  onClose,
  initialFocusTab,
}: {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusTab?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tab1Ref = useRef<HTMLButtonElement | null>(null);
  const [tab, setTab] = useState<'tab1' | 'tab2'>('tab1');

  useFocusTrap(containerRef, isOpen, {
    initialFocusRef: initialFocusTab ? tab1Ref : undefined,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  return (
    <div ref={containerRef} data-testid="modal-container" tabIndex={-1}>
      <button data-testid="close-btn" onClick={onClose}>
        Close
      </button>
      <div role="tablist">
        <button
          data-testid="tab-1"
          ref={tab1Ref}
          onClick={() => setTab('tab1')}
        >
          Tab 1
        </button>
        <button data-testid="tab-2" onClick={() => setTab('tab2')}>
          Tab 2
        </button>
      </div>

      {tab === 'tab1' ? (
        <div data-testid="panel-1">
          <input data-testid="input-1" placeholder="Input 1" />
          <button data-testid="btn-action-1">Action 1</button>
        </div>
      ) : (
        <div data-testid="panel-2">
          <select data-testid="select-2">
            <option value="a">Option A</option>
          </select>
          <textarea data-testid="textarea-2" defaultValue="Textarea 2" />
          <button data-testid="btn-action-2">Action 2</button>
        </div>
      )}

      <button disabled data-testid="btn-disabled">
        Disabled Button
      </button>
    </div>
  );
}

describe('useFocusTrap Hook Unit Tests', () => {
  it('1. getFocusableElements returns only enabled and focusable interactive elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn-disabled" disabled>Disabled</button>
      <a href="https://example.com" id="link1">Link</a>
      <input type="text" id="input1" />
      <input type="hidden" id="input-hidden" />
      <select id="select1"><option>1</option></select>
      <textarea id="textarea1"></textarea>
      <div tabindex="0" id="div-tabindex">Focusable Div</div>
      <div tabindex="-1" id="div-negative-tabindex">Ignored Div</div>
      <button id="btn-aria-hidden" aria-hidden="true">Hidden</button>
    `;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    const ids = focusable.map((el) => el.id);

    expect(ids).toEqual([
      'btn1',
      'link1',
      'input1',
      'select1',
      'textarea1',
      'div-tabindex',
    ]);

    document.body.removeChild(container);
  });

  it('2. Focuses initialFocusRef on open if provided', async () => {
    render(<TestModal isOpen={true} initialFocusTab={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-1')).toHaveFocus();
    });
  });

  it('3. Forward Tab on last element wraps around to first element', async () => {
    render(<TestModal isOpen={true} />);

    const firstElement = screen.getByTestId('close-btn');
    const lastElement = screen.getByTestId('btn-action-1');

    // Focus last element
    lastElement.focus();
    expect(lastElement).toHaveFocus();

    // Fire Tab on last element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });

    expect(firstElement).toHaveFocus();
  });

  it('4. Backward Shift+Tab on first element wraps around to last element', async () => {
    render(<TestModal isOpen={true} />);

    const firstElement = screen.getByTestId('close-btn');
    const lastElement = screen.getByTestId('btn-action-1');

    // Focus first element
    firstElement.focus();
    expect(firstElement).toHaveFocus();

    // Fire Shift+Tab on first element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(lastElement).toHaveFocus();
  });

  it('5. Dynamically adapts focus trap when switching tabs (DOM updates)', async () => {
    render(<TestModal isOpen={true} />);

    // Switch to Tab 2
    fireEvent.click(screen.getByTestId('tab-2'));

    // In Tab 2, last element is btn-action-2
    const firstElement = screen.getByTestId('close-btn');
    const lastElementTab2 = screen.getByTestId('btn-action-2');

    lastElementTab2.focus();
    expect(lastElementTab2).toHaveFocus();

    // Forward Tab wraps to first element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(firstElement).toHaveFocus();

    // Backward Shift+Tab wraps back to last element in Tab 2
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(lastElementTab2).toHaveFocus();
  });

  it('6. Calls onEscape when Escape key is pressed', async () => {
    const handleClose = vi.fn();
    render(<TestModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('7. Restores focus to previous active element when modal unmounts', async () => {
    const triggerButton = document.createElement('button');
    triggerButton.id = 'trigger-btn';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    const { rerender } = render(<TestModal isOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('close-btn')).toHaveFocus();
    });

    // Close modal
    rerender(<TestModal isOpen={false} />);

    expect(document.activeElement).toBe(triggerButton);
    document.body.removeChild(triggerButton);
  });
});
