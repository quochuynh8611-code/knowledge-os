import { describe, it, expect } from "vitest";
import {
  parseFlashcardDelimitedText,
  type FlashcardImportParseResult,
} from "../../src/lib/csvFlashcardParser";

describe("csvFlashcardParser — Unit Tests", () => {
  const DEFAULT_TOPIC_ID = "topic-uuid-123";

  describe("Delimiter Detection & Basic Parsing", () => {
    it("parses comma-separated CSV with header correctly", () => {
      const csv = `front,back,type,topicId
"What is TypeScript?","A typed superset of JavaScript","basic","${DEFAULT_TOPIC_ID}"
"What is React?","A JavaScript library for UI","basic","${DEFAULT_TOPIC_ID}"`;

      const result: FlashcardImportParseResult = parseFlashcardDelimitedText(csv);

      expect(result.totalRows).toBe(2);
      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(0);
      expect(result.delimiterDetected).toBe(",");
      expect(result.validRows[0].card).toEqual({
        front: "What is TypeScript?",
        back: "A typed superset of JavaScript",
        type: "basic",
        topicId: DEFAULT_TOPIC_ID,
      });
    });

    it("parses tab-separated TSV correctly", () => {
      const tsv = `front\tback\ttype\ttopicId\nThủ đô Việt Nam là gì?\tHà Nội\tbasic\t${DEFAULT_TOPIC_ID}`;

      const result = parseFlashcardDelimitedText(tsv);

      expect(result.delimiterDetected).toBe("\t");
      expect(result.validRows.length).toBe(1);
      expect(result.validRows[0].card?.front).toBe("Thủ đô Việt Nam là gì?");
      expect(result.validRows[0].card?.back).toBe("Hà Nội");
    });

    it("handles quotes with commas and escaped quotes correctly", () => {
      const csv = `front,back\n"Question with, comma","Answer with ""escaped quotes"""`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows.length).toBe(1);
      expect(result.validRows[0].card?.front).toBe("Question with, comma");
      expect(result.validRows[0].card?.back).toBe('Answer with "escaped quotes"');
    });

    it("handles headerless 2-column format", () => {
      const csv = `"Front 1","Back 1"\n"Front 2","Back 2"`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.totalRows).toBe(2);
      expect(result.validRows.length).toBe(2);
      expect(result.validRows[0].card?.front).toBe("Front 1");
      expect(result.validRows[0].card?.back).toBe("Back 1");
      expect(result.validRows[0].card?.type).toBe("basic");
      expect(result.validRows[0].card?.topicId).toBe(DEFAULT_TOPIC_ID);
    });
  });

  describe("Topic Resolution Policy (Addendum Compliance)", () => {
    it("uses row topicId when present", () => {
      const specificTopicId = "specific-topic-999";
      const csv = `front,back,type,topicId\n"Front","Back","basic","${specificTopicId}"`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows[0].card?.topicId).toBe(specificTopicId);
    });

    it("falls back to defaultTopicId when row topicId is omitted", () => {
      const csv = `front,back\n"Front","Back"`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows.length).toBe(1);
      expect(result.validRows[0].card?.topicId).toBe(DEFAULT_TOPIC_ID);
    });

    it("rejects row when neither row topicId nor defaultTopicId is provided", () => {
      const csv = `front,back\n"Front","Back"`;

      const result = parseFlashcardDelimitedText(csv); // No defaultTopicId

      expect(result.validRows.length).toBe(0);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].lineNumber).toBe(2);
      expect(result.invalidRows[0].error).toMatch(/topic/i);

    });

    it("does not treat 'topic' column name as topicId", () => {
      // Per Addendum: "topic: tên hiển thị, không được tự động suy ra thành FK"
      const csv = `front,back,topic\n"Front","Back","Triết học Phật giáo"`;

      const result = parseFlashcardDelimitedText(csv); // No defaultTopicId provided

      expect(result.validRows.length).toBe(0);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].error).toMatch(/topic/i);
    });
  });

  describe("Front, Back & Cloze Validation (Row Rejection)", () => {
    it("rejects rows with empty front", () => {
      const csv = `front,back\n"","Back answer"`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows.length).toBe(0);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].error).toMatch(/front/i);
    });

    it("rejects rows with empty back", () => {
      const csv = `front,back\n"Front question",""`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows.length).toBe(0);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].error).toMatch(/back/i);
    });

    it("validates cloze card when type is cloze and front has cloze pattern", () => {
      const csv = `front,back,type\n"{{c1::Hà Nội}} là thủ đô của Việt Nam.","Hà Nội","cloze"`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows.length).toBe(1);
      expect(result.validRows[0].card?.type).toBe("cloze");
    });

    it("rejects cloze card when type is cloze but front lacks cloze pattern", () => {
      const csv = `front,back,type\n"Hà Nội là thủ đô của Việt Nam.","Hà Nội","cloze"`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.validRows.length).toBe(0);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].error).toMatch(/cloze/i);
    });

    it("skips blank and whitespace-only lines without reporting them as errors", () => {
      const csv = `front,back\n"Front 1","Back 1"\n   \n\n"Front 2","Back 2"\n`;

      const result = parseFlashcardDelimitedText(csv, {
        defaultTopicId: DEFAULT_TOPIC_ID,
      });

      expect(result.totalRows).toBe(2);
      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(0);
    });
  });
});
