import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataProvider, useData, ActiveTab } from '../../src/context/DataContext';
import { Sidebar } from '../../src/components/layout/Sidebar';
import App from '../../src/App';

function SidebarWithActiveTab({ tab }: { tab: ActiveTab }) {
  const { setActiveTab } = useData();
  React.useEffect(() => {
    setActiveTab(tab);
  }, [tab, setActiveTab]);
  return <Sidebar />;
}

describe('Phase 7D / Phase 13: Information Architecture & Navigation Refactoring', () => {
  describe('1. 3-Tier Navigation (Học tập, Tri thức, Công cụ)', () => {
    it('1.1. Khối "Học tập" và "Tri thức" chứa các luồng công việc học tập và quản trị tri thức', () => {
      render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Verify 3 sections exist
      expect(screen.getByText(/^Học tập$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Tri thức$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Công cụ$/i)).toBeInTheDocument();

      // Learning items
      expect(screen.getByText('Tổng quan')).toBeInTheDocument();
      expect(screen.getByText(/Tiến độ/i)).toBeInTheDocument();
      expect(screen.getByText('Chủ đề học')).toBeInTheDocument();

      // Knowledge items
      expect(screen.getByText('Ghi chú')).toBeInTheDocument();
      expect(screen.getByText('Tài liệu')).toBeInTheDocument();
      expect(screen.getByText('Bản đồ tri thức')).toBeInTheDocument();
      expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
    });
  });

  describe('2. Tools & Scholar Suite Group (Công cụ)', () => {
    it('2.1. Có nhóm "Công cụ" riêng biệt chứa các module phân tích chuyên ngành', () => {
      render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Section title for tools must exist
      expect(screen.getByText(/^Công cụ$/i)).toBeInTheDocument();

      // Specialized tools must be present in Sidebar
      expect(screen.getByText('AI Hỗ trợ')).toBeInTheDocument();
      expect(screen.getByText('Ma trận phân tích')).toBeInTheDocument();
      expect(screen.getByText('Mô hình hệ thống')).toBeInTheDocument();
      expect(screen.getByText('Từ điển thuật ngữ')).toBeInTheDocument();
    });

    it('2.2. Nhấp vào công cụ chuyên sâu sẽ kích hoạt chuyển đổi tab tương ứng', () => {
      function TestHost() {
        const { activeTab } = useData();
        return (
          <div>
            <div data-testid="current-tab">{activeTab}</div>
            <Sidebar />
          </div>
        );
      }

      render(
        <DataProvider>
          <TestHost />
        </DataProvider>
      );

      const matrixBtn = screen.getByText('Ma trận phân tích').closest('button');
      expect(matrixBtn).toBeDefined();
      if (matrixBtn) {
        fireEvent.click(matrixBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('abhidharma_matrix');
      }

      const systemBtn = screen.getByText('Mô hình hệ thống').closest('button');
      if (systemBtn) {
        fireEvent.click(systemBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('divination_matrix');
      }

      const lexiconBtn = screen.getByText('Từ điển thuật ngữ').closest('button');
      if (lexiconBtn) {
        fireEvent.click(lexiconBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('lexicon');
      }
    });

    it('2.3. Đánh dấu trạng thái Active chuẩn xác khi activeTab thuộc công cụ chuyên sâu', () => {
      render(
        <DataProvider>
          <SidebarWithActiveTab tab="abhidharma_matrix" />
        </DataProvider>
      );

      const matrixBtn = screen.getByText('Ma trận phân tích').closest('button');
      expect(matrixBtn?.className).toContain('bg-amber-100');
    });
  });

  describe('3. Backward Compatibility & Route Resilience in App.tsx', () => {
    it('3.1. App render không bị crash và hiển thị đúng module khi activeTab là công cụ chuyên sâu', () => {
      function AppWithTab({ tab }: { tab: ActiveTab }) {
        const { setActiveTab } = useData();
        React.useEffect(() => {
          setActiveTab(tab);
        }, [tab, setActiveTab]);
        return <App />;
      }

      const { unmount } = render(
        <DataProvider>
          <AppWithTab tab="abhidharma_matrix" />
        </DataProvider>
      );
      // AbhidharmaMatrix renders
      expect(screen.getByText(/Ma trận phân tích/i)).toBeInTheDocument();
      unmount();

      render(
        <DataProvider>
          <AppWithTab tab="divination_matrix" />
        </DataProvider>
      );
      // DivinationMatrix renders
      expect(screen.getByText(/Mô hình hệ thống/i)).toBeInTheDocument();
    });
  });
});
