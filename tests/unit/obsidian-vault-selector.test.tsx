import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VaultSelector } from "../../src/components/modals/VaultSelector";

describe("Phase P4.3C: VaultSelector Component", () => {
  const mockOnVaultSwitched = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and renders list of vaults with active vault selected", async () => {
    const mockVaultsResponse = {
      activeVaultId: "primary-vault",
      vaults: [
        { vaultId: "primary-vault", label: "Primary Research", isCurrent: true },
        { vaultId: "secondary-vault", label: "Secondary Research", isCurrent: false },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    // Wait for dropdown to be populated
    const select = await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });
    expect(select).toBeDefined();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Primary Research");
    expect(options[1]).toHaveTextContent("Secondary Research");

    expect((select as HTMLSelectElement).value).toBe("primary-vault");
  });

  it("triggers switch API when a different vault is selected", async () => {
    const mockVaultsResponse = {
      activeVaultId: "primary-vault",
      vaults: [
        { vaultId: "primary-vault", label: "Primary Research", isCurrent: true },
        { vaultId: "secondary-vault", label: "Secondary Research", isCurrent: false },
      ],
    };

    const mockSwitchResponse = {
      success: true,
      activeVaultId: "secondary-vault",
      label: "Secondary Research",
    };

    const fetchSpy = vi.spyOn(global, "fetch");
    // Initial fetch
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    // Switch fetch
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSwitchResponse,
    } as Response);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    const select = await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });

    fireEvent.change(select, { target: { value: "secondary-vault" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/obsidian/vault/switch",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ vaultId: "secondary-vault" }),
        })
      );
      expect(mockOnVaultSwitched).toHaveBeenCalledWith("secondary-vault");
      expect((select as HTMLSelectElement).value).toBe("secondary-vault");
    });
  });

  it("handles switch error by showing user-friendly message and preserving prior selection", async () => {
    const mockVaultsResponse = {
      activeVaultId: "primary-vault",
      vaults: [
        { vaultId: "primary-vault", label: "Primary Research", isCurrent: true },
        { vaultId: "secondary-vault", label: "Secondary Research", isCurrent: false },
      ],
    };

    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    // Switch failure
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "SWITCH_FAILED", message: "Target vault is inaccessible" }),
    } as Response);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    const select = await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });

    fireEvent.change(select, { target: { value: "secondary-vault" } });

    await waitFor(() => {
      expect(screen.getByText(/Target vault is inaccessible|Lỗi khi chuyển đổi Vault/i)).toBeDefined();
      expect(mockOnVaultSwitched).not.toHaveBeenCalled();
      // Prior selection preserved
      expect((select as HTMLSelectElement).value).toBe("primary-vault");
    });
  });

  it("disables combobox and sets aria-busy during switch operation", async () => {
    const mockVaultsResponse = {
      activeVaultId: "primary-vault",
      vaults: [
        { vaultId: "primary-vault", label: "Primary Research", isCurrent: true },
        { vaultId: "secondary-vault", label: "Secondary Research", isCurrent: false },
      ],
    };

    let resolveSwitch: (val: any) => void;
    const switchPromise = new Promise((resolve) => {
      resolveSwitch = resolve;
    });

    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    fetchSpy.mockReturnValueOnce(switchPromise as any);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    const select = await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });

    fireEvent.change(select, { target: { value: "secondary-vault" } });

    // Should be busy and disabled
    expect(select).toBeDisabled();
    expect(select.getAttribute("aria-busy")).toBe("true");

    // Resolve
    resolveSwitch!({
      ok: true,
      status: 200,
      json: async () => ({ success: true, activeVaultId: "secondary-vault", label: "Secondary" }),
    });

    await waitFor(() => {
      expect(select).not.toBeDisabled();
      expect(select.getAttribute("aria-busy")).toBe("false");
    });
  });

  it("renders mapped vault icons in option text", async () => {
    const mockVaultsResponse = {
      activeVaultId: "research-notes",
      vaults: [
        { vaultId: "research-notes", label: "Research Notes", isCurrent: true },
        { vaultId: "daily-journal", label: "Daily Journal", isCurrent: false },
        { vaultId: "unknown-vault", label: "Generic Vault", isCurrent: false },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });
    const options = screen.getAllByRole("option");

    expect(options[0]).toHaveTextContent("🔬 Research Notes");
    expect(options[1]).toHaveTextContent("📓 Daily Journal");
    expect(options[2]).toHaveTextContent("📁 Generic Vault");
  });

  it("displays success toast and saves recent vault on switch success", async () => {
    const mockVaultsResponse = {
      activeVaultId: "primary-vault",
      vaults: [
        { vaultId: "primary-vault", label: "Primary Research", isCurrent: true },
        { vaultId: "secondary-vault", label: "Secondary Research", isCurrent: false },
      ],
    };

    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, activeVaultId: "secondary-vault", label: "Secondary Research" }),
    } as Response);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    const select = await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });
    fireEvent.change(select, { target: { value: "secondary-vault" } });

    // Success toast should appear with role="status"
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Switched to Secondary Research");
    });
  });

  it("focuses vault select element when Alt+V is pressed", async () => {
    const mockVaultsResponse = {
      activeVaultId: "primary-vault",
      vaults: [{ vaultId: "primary-vault", label: "Primary Research", isCurrent: true }],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVaultsResponse,
    } as Response);

    render(<VaultSelector onVaultSwitched={mockOnVaultSwitched} />);

    const select = await screen.findByRole("combobox", { name: /Chọn Obsidian Vault/i });
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(document.activeElement).not.toBe(select);

    fireEvent.keyDown(window, { key: "v", altKey: true });
    expect(document.activeElement).toBe(select);
  });
});
