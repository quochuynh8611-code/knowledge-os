import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DataProvider, useData } from "../../src/context/DataContext";
import type { Topic, KnowledgeLink } from "../../src/types";

function KnowledgeLinkTestConsumer() {
  const { topics, addKnowledgeLink, removeKnowledgeLink } = useData();

  return (
    <div>
      <div data-testid="topics-loaded">{topics.length}</div>
      <button
        data-testid="btn-create-link-t1-t2"
        onClick={() => {
          addKnowledgeLink({
            sourceId: "topic-t1",
            targetId: "topic-t2",
            linkType: "related",
            strength: 3,
            notes: "Liên kết giữa T1 và T2",
          });
        }}
      >
        Create Link T1 -&gt; T2
      </button>

      <button
        data-testid="btn-create-prerequisite-t1-t2"
        onClick={() => {
          addKnowledgeLink({
            sourceId: "topic-t1",
            targetId: "topic-t2",
            linkType: "prerequisite",
            strength: 5,
            notes: "T1 là tiền đề của T2",
          });
        }}
      >
        Create Prerequisite T1 -&gt; T2
      </button>

      {topics.map((t) => (
        <div key={t.id} data-testid={`topic-card-${t.id}`}>
          <h4>{t.title}</h4>
          <span data-testid={`topic-links-count-${t.id}`}>
            {t.links ? t.links.length : 0}
          </span>
          <ul data-testid={`topic-links-list-${t.id}`}>
            {(t.links || []).map((l: KnowledgeLink) => {
              const role = l.sourceId === t.id ? "source" : "target";
              return (
                <li key={l.id || `${l.sourceId}-${l.targetId}-${l.linkType}`} data-testid={`link-item-${t.id}-${l.id}`}>
                  <span data-testid={`link-role-${t.id}-${l.id}`}>{role}</span>
                  <span data-testid={`link-type-${t.id}-${l.id}`}>{l.linkType}</span>
                  <span data-testid={`link-target-${t.id}-${l.id}`}>{l.targetId}</span>
                  <span data-testid={`link-source-${t.id}-${l.id}`}>{l.sourceId}</span>
                  <button
                    data-testid={`btn-delete-link-${t.id}-${l.id}`}
                    onClick={() => l.id && removeKnowledgeLink(l.id)}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

describe("Phase 3 Integration: Knowledge Link Persistence & Hydration Flow (ADR-079 / PR-1)", () => {
  const initialCategory = {
    id: "cat-1",
    name: "Triết Học",
    slug: "triet-hoc",
    type: "triet-hoc",
    parentId: null,
  };

  const initialTopicT1: Topic = {
    id: "topic-t1",
    title: "Tứ Diệu Đế",
    slug: "tu-dieu-de",
    categoryId: "cat-1",
    type: "triet-hoc",
    description: "",
    content: "",
    tags: [],
    links: [],
    studyProgress: null,
    createdAt: "2026-10-27T08:00:00Z",
    updatedAt: "2026-10-27T08:00:00Z",
  };

  const initialTopicT2: Topic = {
    id: "topic-t2",
    title: "Bát Chánh Đạo",
    slug: "bat-chanh-dao",
    categoryId: "cat-1",
    type: "triet-hoc",
    description: "",
    content: "",
    tags: [],
    links: [],
    studyProgress: null,
    createdAt: "2026-10-27T08:00:00Z",
    updatedAt: "2026-10-27T08:00:00Z",
  };

  let mockServerLinks: any[] = [];
  let capturedFetchCalls: { url: string; method?: string; body?: any }[] = [];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockServerLinks = [];
    capturedFetchCalls = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      capturedFetchCalls.push({ url, method, body });

      if (url.includes("/api/categories")) {
        return {
          ok: true,
          status: 200,
          json: async () => [initialCategory],
        } as Response;
      }

      if (url.includes("/api/topics")) {
        // Return topics with canonical links mapped from mockServerLinks
        const mappedTopics = [initialTopicT1, initialTopicT2].map((top) => {
          const outgoing = mockServerLinks.filter((l) => l.sourceId === top.id);
          const incoming = mockServerLinks.filter((l) => l.targetId === top.id);
          return {
            ...top,
            links: [...outgoing, ...incoming],
          };
        });
        return {
          ok: true,
          status: 200,
          json: async () => mappedTopics,
        } as Response;
      }

      if (url.includes("/api/links")) {
        if (method === "POST") {
          const newLink = {
            id: body.id || `klink-${Date.now()}`,
            ...body,
            createdAt: new Date().toISOString(),
          };
          mockServerLinks.push(newLink);
          return {
            ok: true,
            status: 201,
            json: async () => newLink,
          } as Response;
        }

        if (method === "DELETE") {
          const linkId = url.split("/api/links/")[1]?.split("?")[0];
          mockServerLinks = mockServerLinks.filter((l) => l.id !== linkId);
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, id: linkId }),
          } as Response;
        }
      }

      if (url.includes("/api/notes") || url.includes("/api/resources") || url.includes("/api/tags")) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }

      if (url.includes("/api/sync/hydrate")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            summary: {
              categoriesUpserted: 0,
              topicsUpserted: 0,
              notesUpserted: 0,
              resourcesUpserted: 0,
              tagsUpserted: 0,
              linksUpserted: (body?.links || []).length,
              progressMerged: 0,
            },
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── Scenario 1: Creating a link displays bidirectionally and persists ─────

  it("Scenario 1: Creating a link from T1 to T2 persists to server and exposes bidirectional projection", async () => {
    render(
      <DataProvider>
        <KnowledgeLinkTestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topics-loaded").textContent).toBe("2");
    });

    // Click create link
    fireEvent.click(screen.getByTestId("btn-create-link-t1-t2"));

    // Verify link is visible under T1 as source
    await waitFor(() => {
      expect(screen.getByTestId("topic-links-count-topic-t1").textContent).toBe("1");
    });

    // In Red phase: DataContext only adds to sourceId, so targetId T2 has 0 links (FAILS)
    // In Green phase: Both T1 and T2 must reflect the bidirectional link
    expect(screen.getByTestId("topic-links-count-topic-t2").textContent).toBe("1");

    // In Red phase: DataContext calls saveTopic instead of canonical link endpoint POST /api/links (FAILS)
    const postLinkCall = capturedFetchCalls.find(
      (c) => c.url.includes("/api/links") && c.method === "POST"
    );
    expect(postLinkCall).toBeDefined();
    expect(postLinkCall?.body).toMatchObject({
      sourceId: "topic-t1",
      targetId: "topic-t2",
      linkType: "related",
    });
  });

  // ─── Scenario 2: Links survive application reload (Hydration) ─────────────

  it("Scenario 2: Client creates link -> Reload -> Link remains visible and survives server hydration", async () => {
    // 1. Initial mount
    const { unmount } = render(
      <DataProvider>
        <KnowledgeLinkTestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topics-loaded").textContent).toBe("2");
    });

    // 2. User creates link
    fireEvent.click(screen.getByTestId("btn-create-link-t1-t2"));

    await waitFor(() => {
      expect(screen.getByTestId("topic-links-count-topic-t1").textContent).toBe("1");
    });

    // 3. User reloads (unmount and remount DataProvider)
    unmount();

    render(
      <DataProvider>
        <KnowledgeLinkTestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topics-loaded").textContent).toBe("2");
    });

    // In Red phase: Because addKnowledgeLink never persisted to POST /api/links,
    // server mockServerLinks has 0 links. After reload, T1 and T2 have 0 links (FAILS)!
    // In Green phase: The link was persisted to server and hydrated back!
    expect(screen.getByTestId("topic-links-count-topic-t1").textContent).toBe("1");
    expect(screen.getByTestId("topic-links-count-topic-t2").textContent).toBe("1");
  });

  // ─── Scenario 3: Deleting a link removes it permanently without revival ───

  it("Scenario 3: Deleting a link removes it from canonical store and does not resurrect after reload", async () => {
    const canonicalLink = {
      id: "klink-to-delete-99",
      sourceId: "topic-t1",
      targetId: "topic-t2",
      linkType: "related",
      strength: 3,
    };
    mockServerLinks.push(canonicalLink);

    const { unmount } = render(
      <DataProvider>
        <KnowledgeLinkTestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topic-links-count-topic-t1").textContent).toBe("1");
    });

    // Delete the link
    const deleteBtn = screen.getByTestId("btn-delete-link-topic-t1-klink-to-delete-99");
    fireEvent.click(deleteBtn);

    // In Red phase: removeKnowledgeLink calls saveTopic, not DELETE /api/links (FAILS)
    await waitFor(() => {
      const deleteCall = capturedFetchCalls.find(
        (c) => c.url.includes("/api/links/klink-to-delete-99") && c.method === "DELETE"
      );
      expect(deleteCall).toBeDefined();
    });

    expect(mockServerLinks.some((l) => l.id === "klink-to-delete-99")).toBe(false);

    unmount();

    // Reload application
    render(
      <DataProvider>
        <KnowledgeLinkTestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topics-loaded").textContent).toBe("2");
    });

    // Link must NOT resurrect
    expect(screen.getByTestId("topic-links-count-topic-t1").textContent).toBe("0");
    expect(screen.getByTestId("topic-links-count-topic-t2").textContent).toBe("0");
  });

  // ─── Scenario 4: UI clearly distinguishes Source vs Target ────────────────

  it("Scenario 4: Bidirectional view clearly preserves Source -> Target semantic distinction", async () => {
    const prerequisiteLink = {
      id: "klink-prereq-1",
      sourceId: "topic-t1",
      targetId: "topic-t2",
      linkType: "prerequisite",
      strength: 5,
      notes: "T1 là điều kiện tiên quyết của T2",
    };
    mockServerLinks.push(prerequisiteLink);

    render(
      <DataProvider>
        <KnowledgeLinkTestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topics-loaded").textContent).toBe("2");
    });

    await waitFor(() => {
      expect(screen.getByTestId("topic-links-count-topic-t1").textContent).toBe("1");
      expect(screen.getByTestId("topic-links-count-topic-t2").textContent).toBe("1");
    });

    // Topic T1 is the source (prerequisite provider)
    const roleT1 = screen.getByTestId("link-role-topic-t1-klink-prereq-1").textContent;
    expect(roleT1).toBe("source");
    expect(screen.getByTestId("link-target-topic-t1-klink-prereq-1").textContent).toBe("topic-t2");

    // Topic T2 is the target (prerequisite receiver)
    const roleT2 = screen.getByTestId("link-role-topic-t2-klink-prereq-1").textContent;
    expect(roleT2).toBe("target");
    expect(screen.getByTestId("link-source-topic-t2-klink-prereq-1").textContent).toBe("topic-t1");
  });
});
