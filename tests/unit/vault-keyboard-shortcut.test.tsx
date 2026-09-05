import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { useRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useVaultKeyboardShortcut } from "../../src/hooks/useVaultKeyboardShortcut";

function DummyVaultComponent({ onEscape }: { onEscape?: () => void }) {
  const selectRef = useRef<HTMLSelectElement>(null);
  useVaultKeyboardShortcut({ targetRef: selectRef, onEscape, enabled: true });

  return (
    <div>
      <label htmlFor="vault-select">Vault</label>
      <select id="vault-select" ref={selectRef} data-testid="vault-select">
        <option value="v1">Vault 1</option>
        <option value="v2">Vault 2</option>
      </select>
    </div>
  );
}

describe("Phase P4.3D: useVaultKeyboardShortcut Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("focuses target element when Alt+V is pressed", () => {
    render(<DummyVaultComponent />);
    const select = screen.getByTestId("vault-select");

    expect(document.activeElement).not.toBe(select);

    fireEvent.keyDown(window, { key: "v", altKey: true });
    expect(document.activeElement).toBe(select);
  });

  it("calls onEscape callback when Escape is pressed while active", () => {
    const mockOnEscape = vi.fn();
    render(<DummyVaultComponent onEscape={mockOnEscape} />);
    const select = screen.getByTestId("vault-select");
    select.focus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnEscape).toHaveBeenCalledTimes(1);
  });

  it("cleans up keydown listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<DummyVaultComponent />);

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
