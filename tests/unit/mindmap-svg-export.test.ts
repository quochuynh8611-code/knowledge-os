import { describe, it, expect } from "vitest";
import {
  projectToMindMapTree,
  MindMapTreeProjection,
} from "../../src/lib/mindmapProjection";
import {
  exportMindMapToSvg,
  getMindMapExportFilename,
} from "../../src/lib/mindmapExport";
import { Topic, Note, Resource } from "../../src/types";

describe("MindMap Standalone SVG Export (Phase C1)", () => {
  const sampleTopics: Topic[] = [
    {
      id: "topic-root",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      categoryId: "dharma",
      type: "dharma",
      description: "Bốn chân lý tối thượng",
      content: "Nội dung Tứ Diệu Đế",
      tags: ["co-ban"],
      visibility: "active",
      studyProgress: {
        topicId: "topic-root",
        status: "in_progress",
        progress: 60,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 2,
        totalNotes: 5,
        timeSpent: 30,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      links: [
        { id: "l1", sourceId: "topic-root", targetId: "topic-dukkha", linkType: "prerequisite", strength: 5 },
        { id: "l2", sourceId: "topic-root", targetId: "topic-samudaya", linkType: "related", strength: 4 },
      ],
    },
    {
      id: "topic-dukkha",
      title: "Khổ Đế",
      slug: "kho-de",
      categoryId: "dharma",
      type: "dharma",
      description: "Thực tại của sự khổ",
      content: "Nội dung Khổ Đế",
      tags: [],
      visibility: "active",
      studyProgress: {
        topicId: "topic-dukkha",
        status: "completed",
        progress: 100,
        interval: 10,
        easeFactor: 2.5,
        repetitions: 5,
        totalNotes: 3,
        timeSpent: 60,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      links: [
        { id: "l3", sourceId: "topic-dukkha", targetId: "topic-samudaya", linkType: "contradicts", strength: 3 },
      ],
    },
    {
      id: "topic-samudaya",
      title: "Tập Đế",
      slug: "tap-de",
      categoryId: "dharma",
      type: "dharma",
      description: "Nguồn gốc của khổ",
      content: "Nội dung Tập Đế",
      tags: [],
      visibility: "active",
      studyProgress: {
        topicId: "topic-samudaya",
        status: "not_started",
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 1,
        timeSpent: 0,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      links: [],
    },
  ];

  const sampleNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-dukkha",
      title: "Ghi chú Tam Khổ",
      content: "Khổ khổ, hoại khổ, hành khổ",
      type: "study",
      isPrivate: false,
      tags: ["tri-kien"],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  const sampleResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-samudaya",
      title: "Tài liệu Nghiên Cứu Tập Khởi",
      type: "pdf",
      url: "https://example.com/res1.pdf",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  const getProjection = (): MindMapTreeProjection => {
    const proj = projectToMindMapTree(
      {
        topics: sampleTopics,
        notes: sampleNotes,
        resources: sampleResources,
      },
      "topic-root",
      { layoutMode: "tree_horizontal" }
    );
    if (!proj) throw new Error("Failed to project sample mind map");
    return proj;
  };

  describe("exportMindMapToSvg generation", () => {
    it("should export a valid XML SVG structure with proper header and viewBox", () => {
      const projection = getProjection();
      const svg = exportMindMapToSvg(projection, {
        layoutMode: "tree_horizontal",
      });

      expect(svg).toBeDefined();
      expect(svg).toMatch(/^<svg\b/);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("viewBox=");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("Tứ Diệu Đế");
      expect(svg).toContain("Khổ Đế");
      expect(svg).toContain("Tập Đế");
    });

    it("should render both horizontal and vertical tree layouts", () => {
      const projection = getProjection();

      const horizontalSvg = exportMindMapToSvg(projection, {
        layoutMode: "tree_horizontal",
      });
      const verticalSvg = exportMindMapToSvg(projection, {
        layoutMode: "tree_vertical",
      });

      expect(horizontalSvg).toContain("viewBox=");
      expect(verticalSvg).toContain("viewBox=");
      expect(horizontalSvg).not.toEqual(verticalSvg);
    });

    it("should respect collapsedNodeIds and hide collapsed children", () => {
      const projection = getProjection();
      // Collapse topic-dukkha which has note-1 child
      const svg = exportMindMapToSvg(projection, {
        layoutMode: "tree_horizontal",
        collapsedNodeIds: new Set(["topic-dukkha"]),
      });

      expect(svg).toContain("Khổ Đế");
      expect(svg).not.toContain("Ghi chú Tam Khổ");
      // Should show a collapse indicator badge (+1)
      expect(svg).toContain("+1");
    });

    it("should render cross-links when showCrossLinks is true", () => {
      const projection = getProjection();
      expect(projection.crossEdges.length).toBeGreaterThan(0);

      const svgWithCross = exportMindMapToSvg(projection, {
        layoutMode: "tree_horizontal",
        showCrossLinks: true,
        crossEdges: projection.crossEdges,
      });

      expect(svgWithCross).toContain('class="crosslink-edge"');
      expect(svgWithCross).toContain('stroke-dasharray="6 4"');

      const svgWithoutCross = exportMindMapToSvg(projection, {
        layoutMode: "tree_horizontal",
        showCrossLinks: false,
      });

      // Without cross-links, crosslink edge group should not be rendered
      expect(svgWithoutCross).not.toContain('class="crosslink-edge"');
    });

    it("should omit cross-links if either endpoint is collapsed", () => {
      const projection = getProjection();
      // The cross edge is between topic-dukkha and topic-samudaya
      const svg = exportMindMapToSvg(projection, {
        layoutMode: "tree_horizontal",
        showCrossLinks: true,
        crossEdges: projection.crossEdges,
        collapsedNodeIds: new Set(["topic-dukkha"]),
      });

      expect(svg).not.toContain('class="crosslink-edge"');
    });

    it("should include metadata watermark and title", () => {
      const projection = getProjection();
      const svg = exportMindMapToSvg(projection);

      expect(svg).toContain("Knowledge OS");
      expect(svg).toContain("Tứ Diệu Đế");
    });
  });

  describe("getMindMapExportFilename utility", () => {
    it("should generate a sanitized filename with topic title, layout mode and date", () => {
      const filename = getMindMapExportFilename(
        "Tứ Diệu Đế & Bát Chánh Đạo!",
        "tree_horizontal",
        "svg"
      );

      expect(filename).toMatch(/^MindMap-Tu_Dieu_De_Bat_Chanh_Dao-tree_horizontal-\d{4}-\d{2}-\d{2}\.svg$/);
    });

    it("should handle empty or special character titles gracefully", () => {
      const filename = getMindMapExportFilename("", "tree_vertical", "svg");
      expect(filename).toMatch(/^MindMap-Topic-tree_vertical-\d{4}-\d{2}-\d{2}\.svg$/);
    });
  });
});
