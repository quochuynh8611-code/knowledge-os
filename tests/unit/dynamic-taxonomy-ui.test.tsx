import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { TopicTree } from '../../src/components/topics/TopicTree';
import { TopicFormModal } from '../../src/components/modals/TopicFormModal';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
  };
});

function TestHarness({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}

function TopicTreeTestConsumer() {
  const { addCategory, hideTopic, restoreTopic, topics, notes, resources } = useData();
  return (
    <div>
      <TopicTree />
      <div data-testid="active-count">
        {topics.filter((t) => t.visibility !== 'hidden').length}
      </div>
      <div data-testid="hidden-count">
        {topics.filter((t) => t.visibility === 'hidden').length}
      </div>
      <div data-testid="notes-count">{notes.length}</div>
      <div data-testid="resources-count">{resources.length}</div>
    </div>
  );
}

describe('Post-Phase 5: Dynamic Taxonomy & Topic Visibility UI Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Sidebar renders dynamic root categories and provides "Thêm lĩnh vực" button', () => {
    render(
      <TestHarness>
        <Sidebar />
      </TestHarness>
    );

    // Verify "Lĩnh Vực Khảo Cứu" section exists
    expect(screen.getByText(/Lĩnh Vực Khảo Cứu/i)).toBeInTheDocument();

    // Verify "Thêm lĩnh vực" button exists
    expect(screen.getByText(/Thêm lĩnh vực/i)).toBeInTheDocument();
  });

  it('2. Adding a new domain from Sidebar adds a new root category immediately', () => {
    render(
      <TestHarness>
        <Sidebar />
      </TestHarness>
    );

    const addBtn = screen.getByText(/Thêm lĩnh vực/i);
    fireEvent.click(addBtn);

    const input = screen.getByPlaceholderText(/Tên lĩnh vực mới/i);
    fireEvent.change(input, { target: { value: 'Khoa Học Tự Nhiên' } });

    const saveBtn = screen.getByText(/Lưu/i);
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Khoa Học Tự Nhiên/i)).toBeInTheDocument();
  });

  it('3. TopicTree allows soft-hiding an active topic and restoring it without losing notes or resources', () => {
    render(
      <TestHarness>
        <TopicTreeTestConsumer />
      </TestHarness>
    );

    expect(screen.getByText(/Cây Phân Cấp/i)).toBeInTheDocument();

    // Initial notes count
    const initialNotesCount = screen.getByTestId('notes-count').textContent;
    const initialResourcesCount = screen.getByTestId('resources-count').textContent;

    // Find first hide button
    const hideButtons = screen.getAllByTitle(/Ẩn chủ đề/i);
    expect(hideButtons.length).toBeGreaterThan(0);
    fireEvent.click(hideButtons[0]);

    // Notes and resources counts remain untouched
    expect(screen.getByTestId('notes-count').textContent).toBe(initialNotesCount);
    expect(screen.getByTestId('resources-count').textContent).toBe(initialResourcesCount);

    // Switch visibility filter to "Chủ đề đã ẩn"
    const visSelect = screen.getByDisplayValue(/Chủ đề hoạt động/i);
    fireEvent.change(visSelect, { target: { value: 'hidden' } });

    // Should now see the hidden topic with "Khôi phục" button
    const restoreButtons = screen.getAllByTitle(/Khôi phục hiển thị chủ đề/i);
    expect(restoreButtons.length).toBeGreaterThan(0);

    // Restore it
    fireEvent.click(restoreButtons[0]);

    // Switch back to active
    fireEvent.change(visSelect, { target: { value: 'active' } });
    expect(screen.getAllByTitle(/Ẩn chủ đề/i).length).toBe(hideButtons.length);
  });

  it('4. TopicFormModal provides dynamic category selection based on available categories', () => {
    render(
      <TestHarness>
        <TopicFormModal isOpen={true} onClose={vi.fn()} />
      </TestHarness>
    );

    // Form title
    expect(screen.getByText(/Tạo Chủ Đề Nghiên Cứu Mới/i)).toBeInTheDocument();
    // Category select dropdown exists
    expect(screen.getByLabelText(/Danh mục phân cấp/i)).toBeInTheDocument();
  });

  it('5. TopicTree renders Add Domain CTA button and allows creating domain directly from TopicTree', () => {
    render(
      <TestHarness>
        <TopicTree />
      </TestHarness>
    );

    // Verify Add Domain button exists in TopicTree
    const addDomainBtns = screen.getAllByText(/Thêm lĩnh vực/i);
    expect(addDomainBtns.length).toBeGreaterThan(0);

    // Click Add Domain CTA in TopicTree
    fireEvent.click(addDomainBtns[0]);

    // Find input and submit
    const input = screen.getByPlaceholderText(/Tên lĩnh vực mới/i);
    fireEvent.change(input, { target: { value: 'Khoa Học Xã Hội' } });

    const saveBtn = screen.getByText(/Lưu/i);
    fireEvent.click(saveBtn);

    // Verify newly added root category is displayed in domain filter
    expect(screen.getAllByText(/Khoa Học Xã Hội/i).length).toBeGreaterThan(0);
  });

  it('6. TopicTree filter by "Phật Học" shows topics belonging to its descendant categories (not 0 topics)', () => {
    render(
      <TestHarness>
        <TopicTree />
      </TestHarness>
    );

    // Find and click "Phật Học" domain button
    const phDomainBtn = screen.getByRole('button', { name: /Phật Học/i });
    fireEvent.click(phDomainBtn);

    // Topic count for Phật Học must be > 0 and descendant categories should be displayed
    expect(screen.queryByText(/Phật Học \(0 chủ đề\)/i)).toBeNull();
    // Tam Tạng or related topics must be visible
    expect(screen.getAllByText(/Tam Tạng/i).length).toBeGreaterThan(0);
  });

  it('7. TopicTree filter by "Huyền Học" shows topics belonging to its descendant categories (not 0 topics)', () => {
    render(
      <TestHarness>
        <TopicTree />
      </TestHarness>
    );

    // Find and click "Huyền Học" domain button
    const hhDomainBtn = screen.getByRole('button', { name: /Huyền Học/i });
    fireEvent.click(hhDomainBtn);

    // Topic count for Huyền Học must be > 0
    expect(screen.queryByText(/Huyền Học \(0 chủ đề\)/i)).toBeNull();
    // Tam Thức or related topics must be visible
    expect(screen.getAllByText(/Tam Thức/i).length).toBeGreaterThan(0);
  });
});
