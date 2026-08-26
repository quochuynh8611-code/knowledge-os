import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { TopicTree } from '../../src/components/topics/TopicTree';
import { Category, Topic } from '../../src/types';

describe('BUG FIX: Domain Type Mismatch — "Kinh Tế" Domain Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('Scenario 1: Creating new domain "Kinh Tế" via TopicTree creates category with type = "kinh-te" (not "huyen-hoc" or undefined)', () => {
    let capturedCategories: Category[] = [];

    function Observer() {
      const { categories } = useData();
      capturedCategories = categories;
      return null;
    }

    render(
      <DataProvider>
        <Observer />
        <TopicTree />
      </DataProvider>
    );

    // Click "Thêm Lĩnh Vực" button in header
    const addDomainBtns = screen.getAllByRole('button', { name: /Thêm Lĩnh Vực/i });
    act(() => {
      fireEvent.click(addDomainBtns[0]);
    });

    // Type domain name "Kinh Tế"
    const input = screen.getByPlaceholderText(/Tên lĩnh vực mới/i);
    act(() => {
      fireEvent.change(input, { target: { value: 'Kinh Tế' } });
    });

    // Save
    const saveBtn = screen.getByRole('button', { name: 'Lưu' });
    act(() => {
      fireEvent.click(saveBtn);
    });

    const kinhTeCat = capturedCategories.find((c) => c.name === 'Kinh Tế' || c.slug === 'kinh-te');
    expect(kinhTeCat).toBeDefined();
    expect(kinhTeCat?.slug).toBe('kinh-te');
    expect(kinhTeCat?.type).toBe('kinh-te');
    expect(kinhTeCat?.type).not.toBe('huyen-hoc');
    expect(kinhTeCat?.type).not.toBe('phat-hoc');
  }, 10000);

  it('Scenario 2: Deleting category "kinh-te" removes category without being blocked by type mismatch', () => {
    let capturedCategories: Category[] = [];
    let capturedTopics: Topic[] = [];

    function TestComponent() {
      const { addCategory, addTopic, deleteCategory, categories, topics } = useData();
      capturedCategories = categories;
      capturedTopics = topics;

      return (
        <div>
          <button
            onClick={() => {
              const catId = addCategory({
                name: 'Kinh Tế',
                slug: 'kinh-te',
                type: 'kinh-te',
                parentId: null,
              });
              addTopic({
                title: 'Kinh tế học vĩ mô',
                slug: 'kinh-te-hoc-vi-mo',
                categoryId: catId,
                type: 'kinh-te',
                description: 'Tổng quan kinh tế học vĩ mô',
                content: 'Nội dung kinh tế',
                tags: ['kinh-te', 'macroeconomics'],
              });
            }}
          >
            Create Kinh Te Domain & Topic
          </button>

          <button
            onClick={() => {
              const cat = categories.find((c) => c.slug === 'kinh-te');
              if (cat) {
                deleteCategory(cat.id);
              }
            }}
          >
            Delete Kinh Te Category
          </button>
        </div>
      );
    }

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    // 1. Create domain and child topic
    act(() => {
      fireEvent.click(screen.getByText('Create Kinh Te Domain & Topic'));
    });
    expect(capturedCategories.some((c) => c.slug === 'kinh-te')).toBe(true);
    expect(capturedTopics.some((t) => t.slug === 'kinh-te-hoc-vi-mo')).toBe(true);

    // 2. Delete domain
    act(() => {
      fireEvent.click(screen.getByText('Delete Kinh Te Category'));
    });
    expect(capturedCategories.some((c) => c.slug === 'kinh-te')).toBe(false);
  }, 10000);

  it('Scenario 3: TopicTree UI renders "Kinh Tế" independently and provides category deletion action', () => {
    window.confirm = vi.fn(() => true);

    render(
      <DataProvider>
        <TopicTree />
      </DataProvider>
    );

    // 1. Click "Thêm Lĩnh Vực" in header
    const addDomainBtns = screen.getAllByRole('button', { name: /Thêm Lĩnh Vực/i });
    act(() => {
      fireEvent.click(addDomainBtns[0]);
    });

    // 2. Type "Kinh Tế" into input
    const input = screen.getByPlaceholderText(/Tên lĩnh vực mới/i);
    act(() => {
      fireEvent.change(input, { target: { value: 'Kinh Tế' } });
    });

    // 3. Save
    const saveBtn = screen.getByRole('button', { name: 'Lưu' });
    act(() => {
      fireEvent.click(saveBtn);
    });

    // 4. Verify "Kinh Tế" is rendered in UI
    expect(screen.getAllByText(/Kinh Tế/i).length).toBeGreaterThanOrEqual(1);

    // 5. Verify category group has delete button
    const deleteButtons = screen.getAllByTitle('Xóa danh mục');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);

    // 6. Click delete category
    act(() => {
      fireEvent.click(deleteButtons[0]);
    });
    expect(window.confirm).toHaveBeenCalled();
  }, 10000);
});
