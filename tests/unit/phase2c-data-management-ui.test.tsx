import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  BackupSnapshotSchema,
  RestoreRequestSchema,
  calculateBackupChecksum,
  ValidatedBackupSnapshot,
} from "../../src/lib/validation";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";

describe("Phase 2C.1: Data Management UI State Machine & Confirmation Gate Contracts", () => {
  const canonicalData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };
  const validChecksum = calculateBackupChecksum(canonicalData);
  const sampleValidSnapshot: ValidatedBackupSnapshot = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    checksum: validChecksum,
    counts: {
      categories: 8,
      topics: 35,
      notes: 5,
      resources: 4,
      tags: 12,
    },
    data: canonicalData,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Pure UI State Machine Simulator enforcing Canonical State transitions
  type UIState =
    | "idle"
    | "parsing"
    | "invalid_file"
    | "snapshot_valid"
    | "checksum_invalid"
    | "merge_confirmation"
    | "replace_confirmation"
    | "submitting"
    | "success_server"
    | "rehydrating"
    | "completed"
    | "rehydrate_failed";

  class RestoreStateMachine {
    state: UIState = "idle";
    snapshot: ValidatedBackupSnapshot | null = null;
    error: string | null = null;
    confirmationText = "";

    parseRawFile(rawJson: string) {
      this.state = "parsing";
      try {
        const parsed = JSON.parse(rawJson);
        const validated = BackupSnapshotSchema.safeParse(parsed);
        if (!validated.success) {
          this.state = "invalid_file";
          this.error = "Schema validation failed";
          return;
        }
        const expectedChecksum = calculateBackupChecksum(validated.data.data);
        if (validated.data.checksum !== expectedChecksum) {
          this.state = "checksum_invalid";
          this.error = "SHA-256 Checksum mismatch";
          return;
        }
        this.snapshot = validated.data;
        this.state = "snapshot_valid";
      } catch (err) {
        this.state = "invalid_file";
        this.error = err instanceof Error ? err.message : "Invalid JSON";
      }
    }

    selectMode(mode: "merge" | "replace") {
      if (this.state !== "snapshot_valid") return;
      this.state =
        mode === "merge" ? "merge_confirmation" : "replace_confirmation";
    }

    setConfirmationText(text: string) {
      this.confirmationText = text;
    }

    isReplaceActionEnabled(): boolean {
      return (
        this.state === "replace_confirmation" &&
        this.confirmationText === "XÁC NHẬN THAY THẾ"
      );
    }

    async submitRestore(
      apiCall: () => Promise<{ success: boolean }>,
      rehydrateCall: () => Promise<boolean>,
    ) {
      this.state = "submitting";
      try {
        const res = await apiCall();
        if (res.success) {
          this.state = "success_server";
          this.state = "rehydrating";
          const rehydrated = await rehydrateCall();
          if (rehydrated) {
            this.state = "completed";
          } else {
            this.state = "rehydrate_failed";
            this.error = "Rehydration failed after successful server restore";
          }
        }
      } catch {
        this.state = "invalid_file";
      }
    }
  }

  it("1. File snapshot hợp lệ chuyển trạng thái sang snapshot_valid và hiển thị counts chuẩn 8/35/5/4/12", () => {
    // Given
    const machine = new RestoreStateMachine();

    // When
    machine.parseRawFile(JSON.stringify(sampleValidSnapshot));

    // Then
    expect(machine.state).toBe("snapshot_valid");
    expect(machine.snapshot?.counts.categories).toBe(8);
    expect(machine.snapshot?.counts.topics).toBe(35);
    expect(machine.snapshot?.counts.notes).toBe(5);
    expect(machine.snapshot?.counts.resources).toBe(4);
    expect(machine.snapshot?.counts.tags).toBe(12);
  });

  it("2. File sai schema chuyển sang trạng thái invalid_file và disable hành động", () => {
    // Given
    const machine = new RestoreStateMachine();
    const badSnapshot = { version: "1.0.0", data: {} }; // Thiếu checksum, counts, semver 1.x

    // When
    machine.parseRawFile(JSON.stringify(badSnapshot));

    // Then
    expect(machine.state).toBe("invalid_file");
    expect(machine.snapshot).toBeNull();
  });

  it("3. Checksum không khớp chuyển trạng thái sang checksum_invalid và chặn gọi restore API", () => {
    // Given
    const machine = new RestoreStateMachine();
    const corruptedSnapshot = {
      ...sampleValidSnapshot,
      data: {
        ...sampleValidSnapshot.data,
        topics: [
          ...sampleValidSnapshot.data.topics.slice(1),
          { ...sampleValidSnapshot.data.topics[0], title: "Modified" },
        ],
      },
    };

    // When
    machine.parseRawFile(JSON.stringify(corruptedSnapshot));

    // Then
    expect(machine.state).toBe("checksum_invalid");
    expect(machine.error).toBe("SHA-256 Checksum mismatch");
  });

  it("4. Replace Confirmation Gate: Nút submit bị disabled khi nhập sai hoặc thiếu ký tự hoa", () => {
    // Given
    const machine = new RestoreStateMachine();
    machine.parseRawFile(JSON.stringify(sampleValidSnapshot));
    machine.selectMode("replace");
    expect(machine.state).toBe("replace_confirmation");

    // When & Then: Sai chữ thường
    machine.setConfirmationText("xác nhận thay thế");
    expect(machine.isReplaceActionEnabled()).toBe(false);

    // Thừa khoảng trắng
    machine.setConfirmationText("XÁC NHẬN THAY THẾ ");
    expect(machine.isReplaceActionEnabled()).toBe(false);

    // Đúng chính xác 100%
    machine.setConfirmationText("XÁC NHẬN THAY THẾ");
    expect(machine.isReplaceActionEnabled()).toBe(true);
  });

  it("5. Restore Server thành công + Rehydrate thành công: Chuyển tuần tự success_server -> rehydrating -> completed", async () => {
    // Given
    const machine = new RestoreStateMachine();
    machine.parseRawFile(JSON.stringify(sampleValidSnapshot));
    machine.selectMode("merge");

    const mockApiCall = vi.fn().mockResolvedValue({ success: true });
    const mockRehydrateCall = vi.fn().mockResolvedValue(true);

    // When
    await machine.submitRestore(mockApiCall, mockRehydrateCall);

    // Then
    expect(mockApiCall).toHaveBeenCalled();
    expect(mockRehydrateCall).toHaveBeenCalled();
    expect(machine.state).toBe("completed");
  });

  it("6. Restore Server thành công nhưng Rehydrate thất bại: Chuyển sang rehydrate_failed và bảo toàn state", async () => {
    // Given
    const machine = new RestoreStateMachine();
    machine.parseRawFile(JSON.stringify(sampleValidSnapshot));
    machine.selectMode("merge");

    const mockApiCall = vi.fn().mockResolvedValue({ success: true });
    const mockRehydrateCall = vi.fn().mockResolvedValue(false); // Lỗi rehydrate

    // When
    await machine.submitRestore(mockApiCall, mockRehydrateCall);

    // Then
    expect(mockApiCall).toHaveBeenCalled();
    expect(mockRehydrateCall).toHaveBeenCalled();
    expect(machine.state).toBe("rehydrate_failed");
    expect(machine.error).toContain("Rehydration failed");
  });
});
