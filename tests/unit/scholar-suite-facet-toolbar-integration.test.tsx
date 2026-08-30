import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultilingualLexicon } from '../../src/components/lexicon/MultilingualLexicon';

describe('Phase P12.2 Wave 3: Multi-Facet Filtering Toolbar UI Integration', () => {
  it('1. Renders Domain and Source Type facet groups with proper accessibility group labels', () => {
    render(<MultilingualLexicon />);

    const domainGroup = screen.getByRole('group', { name: /bộ lọc miền tri thức/i });
    expect(domainGroup).toBeDefined();

    const sourceGroup = screen.getByRole('group', { name: /bộ lọc nguồn cấu trúc/i });
    expect(sourceGroup).toBeDefined();

    // Verify presence of Eastern Medicine domain button with dynamic count
    expect(screen.getByRole('button', { name: /đông y học \(14\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /từ điển \(19\)/i })).toBeDefined();
  });

  it('2. Shows conditional TCM subcategory chips when Eastern Medicine domain is selected', () => {
    render(<MultilingualLexicon />);

    // Initially on "Tất Cả", TCM subcategories group should not be active
    expect(screen.queryByRole('group', { name: /phân nhóm đông y/i })).toBeNull();

    // Click "Đông Y Học"
    const tcmDomainBtn = screen.getByRole('button', { name: /đông y học/i });
    fireEvent.click(tcmDomainBtn);

    // Now TCM subcategories group must appear
    const tcmSubGroup = screen.getByRole('group', { name: /phân nhóm đông y/i });
    expect(tcmSubGroup).toBeDefined();

    expect(screen.getByRole('button', { name: /kinh huyệt \(5\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /tạng tượng \(5\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /dược tính \(4\)/i })).toBeDefined();
  });

  it('3. Filters items when clicking TCM subcategory "Kinh Huyệt"', () => {
    render(<MultilingualLexicon />);

    // Select TCM domain
    fireEvent.click(screen.getByRole('button', { name: /đông y học/i }));

    // Select "Kinh Huyệt"
    const acupointBtn = screen.getByRole('button', { name: /kinh huyệt/i });
    fireEvent.click(acupointBtn);

    // Verify displayed acupoints
    expect(screen.getAllByText(/Hợp Cốc/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Túc Tam Lý/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bách Hội/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nội Quan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tam Âm Giao/i).length).toBeGreaterThan(0);

    // Verify non-acupoint TCM herbs are not displayed
    expect(screen.queryByText(/Nhân Sâm/i)).toBeNull();
  });

  it('4. Resets all filters back to default state when clicking reset button', () => {
    render(<MultilingualLexicon />);

    // Apply filter
    fireEvent.click(screen.getByRole('button', { name: /đông y học/i }));

    // Reset button should be visible
    const resetBtn = screen.getByRole('button', { name: /đặt lại bộ lọc/i });
    expect(resetBtn).toBeDefined();

    // Click reset
    fireEvent.click(resetBtn);

    // Verify all domains are shown again and TCM subcategory group is hidden
    expect(screen.queryByRole('group', { name: /phân nhóm đông y/i })).toBeNull();
  });
});
