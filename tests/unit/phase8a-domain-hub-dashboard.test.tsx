import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('Phase 8A: Multi-Discipline Research Domain Hub (Dashboard Overview)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Domain Hub Section Header & Overview Presentation', () => {
    it('1.1. Dashboard hiển thị tiêu đề phân khu "Lĩnh vực nghiên cứu" nổi bật', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      // Section title for research domains must be visible as a distinct section
      expect(
        screen.getByRole('heading', { name: /Lĩnh vực nghiên cứu|Trung tâm lĩnh vực/i })
      ).toBeInTheDocument();
    });

    it('1.2. Hiển thị đầy đủ các thẻ Root Domain mặc định và thẻ hệ thống Đang học', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      expect(screen.getByText('Phật Học')).toBeInTheDocument();
      expect(screen.getByText('Huyền Học')).toBeInTheDocument();
      expect(screen.getByText('Đang học')).toBeInTheDocument();
    });
  });

  describe('2. User Interaction & Navigation Flow', () => {
    it('2.1. Nhấp vào thẻ lĩnh vực sẽ thiết lập selectedCategoryFilter và chuyển activeTab sang "topics"', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      // Click on "Phật Học" domain card
      const phatHocCard = screen.getByText('Phật Học').closest('div[class*="rounded-2xl"]');
      expect(phatHocCard).toBeDefined();

      if (phatHocCard) {
        fireEvent.click(phatHocCard);
        expect(screen.getByTestId('current-tab').textContent).toBe('topics');
        expect(screen.getByTestId('current-filter').textContent).toBe('cat-root-phat-hoc');
      }
    });

    it('2.2. Nhấp vào thẻ hệ thống "Đang học" chuyển sang tab "progress"', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      const dangHocCard = screen.getByText('Đang học').closest('div[class*="rounded-2xl"]');
      expect(dangHocCard).toBeDefined();

      if (dangHocCard) {
        fireEvent.click(dangHocCard);
        expect(screen.getByTestId('current-tab').textContent).toBe('progress');
      }
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
      expect(screen.getByText(/Vật lý lý thuyết/i)).toBeInTheDocument();
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
    it('4.1. Khối "Tiến độ tuần này" và danh sách hoạt động gần đây hoạt động bình thường', () => {
      render(
        <DataProvider>
          <TestDashboardHost />
        </DataProvider>
      );

      expect(screen.getByText(/Tiến độ tuần này/i)).toBeInTheDocument();
      expect(screen.getByText(/Gần đây/i)).toBeInTheDocument();
    });
  });
});
