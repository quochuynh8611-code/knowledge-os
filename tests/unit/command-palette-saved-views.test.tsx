import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandPalette } from "../../src/components/search/CommandPalette";
import { useCommandPalette } from "../../src/hooks/useCommandPalette";
import type { SavedSearchView } from "../../src/lib/savedViewStorage";

function CommandPaletteHarness({
  savedViews = [],
  onApplySavedView,
  onNavigateTab,
}: {
  savedViews?: SavedSearchView[];
  onApplySavedView?: (view: SavedSearchView) => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const palette = useCommandPalette({
    savedViews,
    onApplySavedView,
    onNavigateTab,
  });

  return (
    <div>
      <button onClick={palette.openPalette}>Open Palette</button>
      <CommandPalette
        isOpen={palette.isOpen}
        onClose={palette.closePalette}
        query={palette.query}
        onQueryChange={palette.setQuery}
        selectedIndex={palette.selectedIndex}
        onSelectIndex={palette.setSelectedIndex}
        items={palette.filteredItems}
        onExecuteItem={palette.executeItem}
      />
    </div>
  );
}

describe("Phase P7.3b: Command Palette Saved Views Convergence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("2.1. injects saved views received via options into command palette items under Navigation category", async () => {
    const mockViews: SavedSearchView[] = [
      {
        id: "view-1",
        name: "Khảo sát Kỳ Môn",
        query: "Kỳ Môn",
        filters: {
          domain: "huyen-hoc",
        },
        pinned: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    render(<CommandPaletteHarness savedViews={mockViews} />);

    // Open Command Palette
    fireEvent.click(screen.getByText("Open Palette"));

    // Find the saved view item
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Type query to filter
    const input = screen.getByPlaceholderText(/Tìm lệnh, chủ đề nghiên cứu/i);
    fireEvent.change(input, { target: { value: "Ky Mon" } });

    // Item must be visible with [Góc nhìn] prefix
    const item = await screen.findByText(/\[Góc nhìn\] Khảo sát Kỳ Môn/i);
    expect(item).toBeInTheDocument();
  });

  it("2.2. executing a saved view item triggers onApplySavedView and switches to search tab", async () => {
    const mockViews: SavedSearchView[] = [
      {
        id: "view-2",
        name: "Chuyên Đề Abhidhamma",
        query: "Abhidhamma",
        filters: {
          domain: "phat-hoc",
        },
        pinned: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const handleApplySavedView = vi.fn();
    const handleNavigateTab = vi.fn();

    render(
      <CommandPaletteHarness
        savedViews={mockViews}
        onApplySavedView={handleApplySavedView}
        onNavigateTab={handleNavigateTab}
      />,
    );

    // Open palette
    fireEvent.click(screen.getByText("Open Palette"));

    // Search and click saved view
    const input = screen.getByPlaceholderText(/Tìm lệnh, chủ đề nghiên cứu/i);
    fireEvent.change(input, { target: { value: "Abhidhamma" } });

    const item = await screen.findByText(/\[Góc nhìn\] Chuyên Đề Abhidhamma/i);
    fireEvent.click(item);

    expect(handleApplySavedView).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "view-2",
        name: "Chuyên Đề Abhidhamma",
        query: "Abhidhamma",
      }),
    );
    expect(handleNavigateTab).toHaveBeenCalledWith("search");
  });
});
