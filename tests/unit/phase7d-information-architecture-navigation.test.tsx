import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Phase 7D / Commercial Reset: Information Architecture & Navigation', () => {
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
      expect(screen.getByText(/Thẻ nhớ/i)).toBeInTheDocument();

      // Knowledge items
      expect(screen.getByText('Ghi chú')).toBeInTheDocument();
      expect(screen.getByText('Tài liệu')).toBeInTheDocument();
      expect(screen.getByText('Bản đồ tri thức')).toBeInTheDocument();
      expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
    });
  });

  describe('2. Commercial Tools Navigation (AI Hỗ trợ & Thư Viện Sách)', () => {
    it('2.1. Khối Công cụ chỉ hiển thị trực tiếp AI Hỗ trợ và Thư Viện Sách; không còn các công cụ cá nhân', () => {
      render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Section title for tools must exist
      expect(screen.getByText(/^Công cụ$/i)).toBeInTheDocument();

      // Commercial tools are directly visible
      expect(screen.getByText('AI Hỗ trợ')).toBeInTheDocument();
      expect(screen.getByText('Thư Viện Sách')).toBeInTheDocument();

      // Removed personal tools must NOT exist
      expect(screen.queryByText('Ma trận phân tích')).not.toBeInTheDocument();
      expect(screen.queryByText('Mô hình hệ thống')).not.toBeInTheDocument();
      expect(screen.queryByText('Từ điển thuật ngữ')).not.toBeInTheDocument();
      expect(screen.queryByText('Tài liệu kiến trúc')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Công cụ phân tích khác/i })).not.toBeInTheDocument();
    });

    it('2.2. Nhấp vào Thư Viện Sách sẽ kích hoạt chuyển đổi tab sang library', () => {
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

      const libraryBtn = screen.getByText('Thư Viện Sách').closest('button');
      expect(libraryBtn).toBeDefined();
      if (libraryBtn) {
        fireEvent.click(libraryBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('library');
      }
    });

    it('2.3. Đánh dấu trạng thái Active chuẩn xác khi activeTab là library', () => {
      render(
        <DataProvider>
          <SidebarWithActiveTab tab="library" />
        </DataProvider>
      );

      const libraryBtn = screen.getByText('Thư Viện Sách').closest('button');
      expect(libraryBtn?.className).toContain('bg-amber-100');
    });
  });

  describe('3. Route Resilience in App.tsx', () => {
    it('3.1. App render không bị crash và hiển thị đúng module khi activeTab là library', async () => {
      function AppWithTab({ tab }: { tab: ActiveTab }) {
        const { setActiveTab } = useData();
        React.useEffect(() => {
          setActiveTab(tab);
        }, [tab, setActiveTab]);
        return <App />;
      }

      render(
        <DataProvider>
          <AppWithTab tab="library" />
        </DataProvider>
      );

      // DocsExplorerView renders with EPUB Library header
      expect(await screen.findByText(/Thư Viện Sách/i)).toBeInTheDocument();
    });
  });
});
