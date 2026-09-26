import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createArchiveRouter } from '../../src/server/routes/archiveRoutes';

describe('Server Archive Upload Deduplication Specification', () => {
  let mockPrisma: any;
  let mockStorage: any;
  let app: express.Express;

  beforeEach(() => {
    mockPrisma = {
      archivedDocument: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockStorage = {
      saveFile: vi.fn().mockResolvedValue({
        fileSize: 1024,
        contentHash: 'a'.repeat(64),
        storageRelPath: 'pdf/aa/test.pdf',
      }),
      statFile: vi.fn().mockResolvedValue({ size: 1024 }),
      createReadStream: vi.fn(),
    };

    app = express();
    app.use(express.raw({ limit: '50mb', type: '*/*' }));
    app.use('/api', createArchiveRouter({ prisma: mockPrisma, storage: mockStorage }));
  });

  it('1. Creates a new ArchivedDocument record when contentHash is not yet in database (HTTP 201)', async () => {
    // findFirst returns null (not found)
    mockPrisma.archivedDocument.findFirst.mockResolvedValue(null);

    const createdRecord = {
      id: 'doc-uuid-new-1',
      fileName: 'new-document.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      fileFormat: 'pdf',
      contentHash: 'a'.repeat(64),
      storageRelPath: 'pdf/aa/test.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPrisma.archivedDocument.create.mockResolvedValue(createdRecord);

    const binaryBuffer = Buffer.from('%PDF-1.4 Mock PDF content');

    const response = await request(app)
      .post('/api/archive/upload?originalName=new-document.pdf&fileFormat=pdf')
      .set('Content-Type', 'application/octet-stream')
      .send(binaryBuffer);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.document).toEqual(createdRecord);

    // Verify findFirst was called with valid contentHash filter
    expect(mockPrisma.archivedDocument.findFirst).toHaveBeenCalledWith({
      where: { contentHash: 'a'.repeat(64) },
    });
    expect(mockPrisma.archivedDocument.create).toHaveBeenCalledTimes(1);
  });

  it('2. Reuses existing ArchivedDocument record when identical contentHash already exists (Deduplication - HTTP 201)', async () => {
    const existingRecord = {
      id: 'doc-uuid-existing-42',
      fileName: 'previously-uploaded.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      fileFormat: 'pdf',
      contentHash: 'a'.repeat(64),
      storageRelPath: 'pdf/aa/test.pdf',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    // findFirst returns existing record
    mockPrisma.archivedDocument.findFirst.mockResolvedValue(existingRecord);

    const binaryBuffer = Buffer.from('%PDF-1.4 Mock duplicate content');

    const response = await request(app)
      .post('/api/archive/upload?originalName=duplicate-name.pdf&fileFormat=pdf')
      .set('Content-Type', 'application/octet-stream')
      .send(binaryBuffer);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.document.id).toBe('doc-uuid-existing-42');
    expect(response.body.document.contentHash).toBe('a'.repeat(64));

    // Verify create was NOT called (no duplicate record created)
    expect(mockPrisma.archivedDocument.create).not.toHaveBeenCalled();
    expect(mockPrisma.archivedDocument.findFirst).toHaveBeenCalledWith({
      where: { contentHash: 'a'.repeat(64) },
    });
  });

  it('3. Does not use findUnique with contentHash (which violates Prisma schema constraints)', async () => {
    mockPrisma.archivedDocument.findFirst.mockResolvedValue(null);
    mockPrisma.archivedDocument.create.mockResolvedValue({
      id: 'doc-123',
      contentHash: 'a'.repeat(64),
    });

    const binaryBuffer = Buffer.from('%PDF-1.4 Content');

    await request(app)
      .post('/api/archive/upload?originalName=sample.pdf&fileFormat=pdf')
      .set('Content-Type', 'application/octet-stream')
      .send(binaryBuffer);

    // Ensure findUnique was NOT called with contentHash
    expect(mockPrisma.archivedDocument.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.archivedDocument.findFirst).toHaveBeenCalledTimes(1);
  });
});
