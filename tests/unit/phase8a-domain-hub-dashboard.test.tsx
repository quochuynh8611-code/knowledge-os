import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';

function TestDashboardHost() {
  const { activeTab, selectedCategoryFilter, addCategory } = useData();
  return (
    <div>
      <div data-testid="current-tab">{activeTab}</div>
      <div data-testid="current-filter">{selectedCategoryFilter || 'all'}</div>
      <button
        data-testid="external-add-domain-btn"
        onClick={() => {
          addCategory({
            name: 'Khoa Học Tự Nhiên',
            slug: 'khoa-hoc-tu-nhien',
            parentId: null,
            description: 'Vật lý lý thuyết, Hóa học hữu cơ và Sinh học tiến hóa',
          });
        }}
      >
        Thêm Domain Ngoài
      </button>
      <DashboardHome />
    </div>
  );
}

describe('Phase 8A / Phase 13: Multi-Discipline Research Domain Hub (Dashboard Overview)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Domain Hub Section Header & Overview Presentation', () => {
    it('1.1. Dashboard hiển thị tiêu đề phân khu "Lĩnh vực học tập" nổi bật', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      // Section title for learning domains must be visible as a distinct section
      expect(
        screen.getByRole('heading', { name: /Lĩnh vực (học tập|nghiên cứu)|Trung tâm lĩnh vực/i })
      ).toBeInTheDocument();
    });

    it('1.2. Hiển thị đầy đủ các thẻ Root Domain mặc định (Phật Học & Huyền Học)', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      expect(screen.getAllByText(/Phật Học/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Huyền Học/i).length).toBeGreaterThan(0);
    });
  });

  describe('2. User Interaction & Navigation Flow', () => {
    it('2.1. Nhấp vào tên lĩnh vực sẽ thiết lập selectedCategoryFilter và chuyển activeTab sang "topics"', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      const phatHocCard = screen.getByTestId('learning-state-card-cat-root-phat-hoc');
      fireEvent.click(phatHocCard);

      expect(screen.getByTestId('current-tab').textContent).toBe('topics');
      expect(screen.getByTestId('current-filter').textContent).toBe('cat-root-phat-hoc');
    });

    it('2.2. Nhấp vào nút "Tất cả tiến độ" chuyển sang tab "progress"', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      const allProgressBtn = screen.getByRole('button', { name: /Tất cả tiến độ/i });
      fireEvent.click(allProgressBtn);
      expect(screen.getByTestId('current-tab').textContent).toBe('progress');
    });
  });

  describe('3. Dynamic User-Created Domains & Direct Add CTA in Domain Hub', () => {
    it('3.1. Lĩnh vực mới do người dùng tạo lập tức hiển thị card trong Domain Hub', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      // Trigger adding a new root category
      fireEvent.click(screen.getByTestId('external-add-domain-btn'));

      // New domain card must render in dashboard
      expect(screen.getByText('Khoa Học Tự Nhiên')).toBeInTheDocument();
    });

    it('3.2. Domain Hub cung cấp CTA "+ Thêm lĩnh vực" trực tiếp trên Dashboard', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      // Direct Add Domain CTA in Dashboard
      const addDomainBtn = screen.getByRole('button', { name: /Thêm lĩnh vực/i });
      expect(addDomainBtn).toBeInTheDocument();
    });
  });

  describe('4. Invariance & Preservation of Surrounding Dashboard Features', () => {
    it('4.1. Khối "Tiếp tục bài học dở dang" và "Ghi chú & Tài liệu mới" hoạt động bình thường', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      expect(screen.getByText(/Tiếp tục bài học dở dang/i)).toBeInTheDocument();
      expect(screen.getByText(/Ghi chú & Tài liệu mới/i)).toBeInTheDocument();
    });
  });
});
