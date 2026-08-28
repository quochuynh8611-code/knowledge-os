import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DataProvider, useData } from "../../src/context/DataContext";
import { Note } from "../../src/types";

// Consumer Component to interact with DataContext
function TestNoteConsumer() {
  const { notes, addNote, updateNote, resetToDefaultData } = useData();

  return (
    <div>
      <div data-testid="notes-count">{notes.length}</div>
      <div data-testid="notes-list">
        {notes.map((n) => (
          <div key={n.id} data-testid={`note-item-${n.id}`}>
            <span data-testid={`note-title-${n.id}`}>{n.title}</span>
            <span data-testid={`note-topicId-${n.id}`}>{n.topicId}</span>
            <span data-testid={`note-topicIds-${n.id}`}>
              {n.topicIds ? n.topicIds.join(",") : "none"}
            </span>
          </div>
        ))}
      </div>
      <button
        data-testid="btn-add-multi-note"
        onClick={() => {
          addNote({
            title: "Ghi Chú Đa Chủ Đề",
            content: "Nội dung nghiên cứu liên môn",
            topicId: "topic-default-fallback",
            topicIds: ["topic-primary-new", "topic-secondary"],
            type: "insight",
            isPrivate: false,
            tags: ["Nghiên Cứu"],
          });
        }}
      >
        Add Multi-Topic Note
      </button>
      <button
        data-testid="btn-update-multi-note"
        onClick={() => {
          const firstNote = notes[0];
          if (firstNote) {
            updateNote(firstNote.id, {
              topicIds: ["topic-updated-first", "topic-updated-second"],
            });
          }
        }}
      >
        Update First Note
      </button>
      <button
        data-testid="btn-reset-data"
        onClick={() => {
          resetToDefaultData();
        }}
      >
        Reset All
      </button>
    </div>
  );
}

describe("Phase P1.3 — ResearchRepositoryV2 DataContext Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("1. addNote with topicIds automatically normalizes primary topicId = topicIds[0]", async () => {
    render(
      <DataProvider>
        <TestNoteConsumer />
      </DataProvider>
    );

    const initialCount = Number(screen.getByTestId("notes-count").textContent);
    const addBtn = screen.getByTestId("btn-add-multi-note");

    await act(async () => {
      addBtn.click();
    });

    expect(Number(screen.getByTestId("notes-count").textContent)).toBe(initialCount + 1);

    // Verify in localStorage that the newly saved note has topicId = "topic-primary-new"
    const rawNotes = localStorage.getItem("phat_hoc_huyen_hoc_clean_v3_notes");
    expect(rawNotes).toBeTruthy();
    const parsedNotes: Note[] = JSON.parse(rawNotes!);
    const added = parsedNotes.find((n) => n.title === "Ghi Chú Đa Chủ Đề");
    expect(added).toBeDefined();
    expect(added?.topicId).toBe("topic-primary-new");
    expect(added?.topicIds).toEqual(["topic-primary-new", "topic-secondary"]);
  });

  it("2. updateNote with topicIds normalizes primary topicId = topicIds[0]", async () => {
    render(
      <DataProvider>
        <TestNoteConsumer />
      </DataProvider>
    );

    const updateBtn = screen.getByTestId("btn-update-multi-note");

    await act(async () => {
      updateBtn.click();
    });

    const rawNotes = localStorage.getItem("phat_hoc_huyen_hoc_clean_v3_notes");
    expect(rawNotes).toBeTruthy();
    const parsedNotes: Note[] = JSON.parse(rawNotes!);
    expect(parsedNotes[0].topicId).toBe("topic-updated-first");
    expect(parsedNotes[0].topicIds).toEqual(["topic-updated-first", "topic-updated-second"]);
  });

  it("3. resetToDefaultData executes through ResearchRepositoryV2 without errors", async () => {
    render(
      <DataProvider>
        <TestNoteConsumer />
      </DataProvider>
    );

    const resetBtn = screen.getByTestId("btn-reset-data");

    await act(async () => {
      resetBtn.click();
    });

    expect(Number(screen.getByTestId("notes-count").textContent)).toBeGreaterThan(0);
  });
});
