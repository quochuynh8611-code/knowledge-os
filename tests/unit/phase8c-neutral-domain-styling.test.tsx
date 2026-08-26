import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { getNeutralDomainStyle, DOMAIN_PALETTES } from '../../src/lib/domainStyling';
import { Category } from '../../src/types';

import { INITIAL_CATEGORIES } from '../../src/data/initialData';

function MultiDomainDashboardHost() {
  return (
    <div>
      <Sidebar />
      <DashboardHome />
    </div>
  );
}

describe('Phase 8C: Neutral & Scalable Domain Styling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Pure Helper: getNeutralDomainStyle Resolver', () => {
    it('1.1. Cung cấp bảng màu học thuật phong phú và đầy đủ token giao diện', () => {
      expect(Array.isArray(DOMAIN_PALETTES)).toBe(true);
      expect(DOMAIN_PALETTES.length).toBeGreaterThanOrEqual(5);

      const sampleCat: Category = {
        id: 'cat-root-sample',
        name: 'Khoa Học Môi Trường',
        slug: 'khoa-hoc-moi-truong',
        parentId: null,
      };

      const style = getNeutralDomainStyle(sampleCat);
      expect(style).toBeDefined();
      expect(style.icon).toBeDefined();
      expect(style.iconBg).toBeDefined();
      expect(style.progressBar).toBeDefined();
      expect(style.hoverBorder).toBeDefined();
    });

    it('1.2. Phân giải bảng màu tất định (Deterministic) và đa dạng cho các domain khác nhau', () => {
      const cat1: Category = { id: 'cat-root-1', name: 'Khoa Học', slug: 'khoa-hoc', parentId: null };
      const cat2: Category = { id: 'cat-root-2', name: 'Kinh Tế', slug: 'kinh-te', parentId: null };
      const cat3: Category = { id: 'cat-root-3', name: 'Lịch Sử', slug: 'lich-su', parentId: null };

      const style1 = getNeutralDomainStyle(cat1);
      const style2 = getNeutralDomainStyle(cat2);
      const style3 = getNeutralDomainStyle(cat3);

      // Same category yields exact same style across multiple calls
      expect(getNeutralDomainStyle(cat1)).toEqual(style1);

      // Different categories should not all collapse into a single identical fallback style
      const distinctProgressBars = new Set([style1.progressBar, style2.progressBar, style3.progressBar]);
      expect(distinctProgressBars.size).toBeGreaterThan(1);
    });
  });

  describe('2. UI Integration: Dashboard & Sidebar Multi-Domain Presentation', () => {
    it('2.1. Dashboard Domain Hub hiển thị các lĩnh vực mới với phong cách trực quan phân biệt', () => {
      const customCategories: Category[] = [
        ...INITIAL_CATEGORIES,
        {
          id: 'cat-root-khoa-hoc',
          name: 'Khoa Học Tự Nhiên',
          slug: 'khoa-hoc-tu-nhien',
          parentId: null,
          description: 'Vật lý, Hóa học, Sinh học',
        },
        {
          id: 'cat-root-kinh-te',
          name: 'Kinh Tế & Tài Chính',
          slug: 'kinh-te-tai-chinh',
          parentId: null,
          description: 'Kinh tế học vĩ mô và phân tích tài chính',
        },
        {
          id: 'cat-root-lich-su',
          name: 'Lịch Sử & Triết Học',
          slug: 'lich-su-triet-hoc',
          parentId: null,
          description: 'Khảo cứu sử liệu và tư tưởng triết học',
        },
      ];
      localStorage.setItem('phat_hoc_huyen_hoc_clean_v3_categories', JSON.stringify(customCategories));

      render(
        <DataProvider>
          <MultiDomainDashboardHost />
        </DataProvider>
      );

      // All 5 domains (2 default + 3 custom) must be rendered in Dashboard
      expect(screen.getAllByText('Phật Học').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Huyền Học').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Khoa Học Tự Nhiên').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Kinh Tế & Tài Chính').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Lịch Sử & Triết Học').length).toBeGreaterThan(0);
    });
  });
});
