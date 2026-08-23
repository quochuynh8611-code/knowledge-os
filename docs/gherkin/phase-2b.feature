Feature: Phase 2B - Database Seeding, Snapshot Backup/Restore and Health Probes

  Background:
    Given Server persistence và cơ sở dữ liệu PostgreSQL đã được cấu hình schema Prisma
    And Dataset canonical export từ initialData.ts có 8 categories, 35 topics, 5 notes, 4 resources và 12 tags

  Scenario: 1. Idempotent seeding populates canonical dataset (8 categories, 35 topics, 5 notes, 4 resources, 12 tags)
    Given Database PostgreSQL đang kết nối hợp lệ
    When Chạy script seeding prisma/seed.ts lần đầu tiên
    Then Bảng Category có đủ 8 danh mục chuẩn
    And Bảng Topic có đủ 35 chủ đề chuẩn kèm StudyProgress và KnowledgeLinks
    And Bảng Note có 5 ghi chú, Resource có 4 tài nguyên và Tag có 12 thẻ
    And Không có lỗi vi phạm ràng buộc toàn vẹn dữ liệu khóa ngoại

  Scenario: 2. Re-running seed preserves data and does not duplicate 35 topics
    Given Database đã được seed 35 topics canonical
    When Chạy lại script seeding prisma/seed.ts lần thứ hai
    Then Tổng số lượng bản ghi Topic vẫn duy trì đúng 35
    And Các khóa slug Category và Topic không bị nhân bản

  Scenario: 3. Export backup snapshot with deterministic SHA-256 checksum
    Given Database đang chứa 8 categories, 35 topics, 5 notes, 4 resources, 12 tags
    When Gửi GET request đến /api/backup/export
    Then Nhận về HTTP 200 với payload hợp lệ theo BackupSnapshotSchema version "2.0.0"
    And Header counts có đúng 5 trường: categories=8, topics=35, notes=5, resources=4, tags=12
    And Checksum khớp chính xác với SHA-256 của chuỗi canonical JSON

  Scenario: 4. Restore backup snapshot in replace mode inside atomic transaction
    Given Một bản backup snapshot hợp lệ với version "2.0.0" chứa 35 topics
    When Gửi POST request đến /api/backup/restore với mode "replace" và confirmReplace là true
    Then Toàn bộ dữ liệu được thay thế bằng snapshot trong một transaction duy nhất
    And Nhận về HTTP 200 với restoredCounts khớp { categories: 8, topics: 35, notes: 5, resources: 4, tags: 12 }

  Scenario: 5. Restore backup snapshot in merge mode applying LWW rules
    Given Database đang có sẵn một số Topic cũ
    And Một bản snapshot chứa Topic trùng slug nhưng có updatedAt mới hơn và progress cao hơn
    When Gửi POST request đến /api/backup/restore với mode "merge"
    Then Topic được cập nhật nội dung mới theo quy tắc Last-Write-Wins
    And Progress giữ giá trị cao nhất và các link mới được gộp vào Topic

  Scenario: 6. Reject restore if checksum is modified or corrupted
    Given Một bản snapshot bị sửa đổi nội dung bên trong data nhưng giữ nguyên checksum
    When Gửi POST request đến /api/backup/restore
    Then Nhận về HTTP 400 với mã lỗi "CHECKSUM_MISMATCH"
    And Database không bị thay đổi (Rollback an toàn)

  Scenario: 7. Reject restore in replace mode without confirmReplace flag
    Given Một bản backup snapshot hợp lệ
    When Gửi POST request đến /api/backup/restore với mode "replace" và confirmReplace là false
    Then Nhận về HTTP 400 Bad Request do vi phạm validation schema

  Scenario: 8. DB Health Probe reports healthy status and latency
    Given Database PostgreSQL đang hoạt động bình thường
    When Gửi GET request đến /api/health/db
    Then Nhận về HTTP 200 với status "healthy", connected là true và latencyMs < 100ms
