import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act, configure } from '@testing-library/react';
import { App } from '../../src/App';

configure({ asyncUtilTimeout: 5000 });
import { Category, Topic } from '../../src/types';
import {
  STORAGE_ROOT_KEY,
  STORAGE_VERSION_KEY,
  CURRENT_STORAGE_VERSION,
} from '../../src/lib/storage';

describe('Sidebar Category Navigation Integration Tests (Test-First)', () => {
  const testCategories: Category[] = [
    {
      id: 'cat-phat-hoc',
      name: 'Phật Học',
      slug: 'phat-hoc',
      parentId: null,
      color: '#475569',
    },
    {
      id: 'cat-cong-nghe',
      name: 'Công Nghệ',
      slug: 'cong-nghe',
      parentId: null,
      color: '#475569',
    },
    {
      id: 'cat-kinh-doanh',
      name: 'Kinh Doanh',
      slug: 'kinh-doanh',
      parentId: null,
      color: '#475569',
    },
    {
      id: 'cat-dong-y',
      name: 'Đông Y',
      slug: 'dong-y',
      parentId: null,
      color: '#475569',
    },
  ];

  const testTopics: Topic[] = [
    {
      id: 'topic-a',
      title: 'Chủ đề A - Tứ Diệu Đế',
      slug: 'tu-dieu-de',
      categoryId: 'cat-phat-hoc',
      type: 'general',
      description: 'Mô tả giáo lý Tứ Diệu Đế cốt lõi',
      content: '# Tứ Diệu Đế\n\nNội dung chi tiết về Khổ, Tập, Diệt, Đạo.',
      tags: ['phat-hoc', 'tu-dieu-de'],
      links: [],
      visibility: 'active',
      studyProgress: {
        topicId: 'topic-a',
        status: 'in_progress',
        progress: 50,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        totalNotes: 0,
        timeSpent: 45,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'topic-b',
      title: 'Chủ đề B - Kiến Trúc Hệ Thống',
      slug: 'kien-truc-he-thong',
      categoryId: 'cat-cong-nghe',
      type: 'general',
      description: 'Mô tả phân lớp và kiến trúc hệ thống hiện đại',
      content: '# Kiến Trúc Hệ Thống\n\nMicroservices, Modular Monolith.',
      tags: ['cong-nghe', 'kien-truc'],
      links: [],
      visibility: 'active',
      studyProgress: {
        topicId: 'topic-b',
        status: 'not_started',
        progress: 0,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'topic-c',
      title: 'Chủ đề C - Dược Tính Đông Y',
      slug: 'duoc-tinh-dong-y',
      categoryId: 'cat-dong-y',
      type: 'general',
      description: 'Mô tả dược tính và phân loại thảo dược',
      content: '# Dược Tính Đông Y\n\nTứ khí ngũ vị.',
      tags: ['dong-y', 'thao-duoc'],
      links: [],
      visibility: 'active',
      studyProgress: {
        topicId: 'topic-c',
        status: 'not_started',
        progress: 0,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify(testCategories));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_topics`, JSON.stringify(testTopics));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_notes`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_resources`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_tags`, JSON.stringify([]));
    window.location.hash = '#/';
  });

  it('Scenario 1: Chuyển lĩnh vực từ màn hình chi tiết chủ đề', async () => {
    // Given đang mở chi tiết chủ đề A thuộc lĩnh vực Phật Học
    window.location.hash = '#/topics/topic-a';
    render(<App />);

    // Chờ giao diện chi tiết chủ đề A nạp xong (h1 trong TopicDetail)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Chủ đề A - Tứ Diệu Đế' })
      ).toBeInTheDocument();
    });

    const sidebar = screen.getByTestId('app-sidebar-container');
    const congNgheBtn = within(sidebar).getByRole('button', { name: /Công Nghệ/i });

    // When bấm lĩnh vực Công Nghệ ở sidebar
    await new Promise((r) => setTimeout(r, 20));
    await act(async () => {
      fireEvent.click(congNgheBtn);
    });

    // Then màn hình chi tiết chủ đề A không còn hiển thị
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 1, name: 'Chủ đề A - Tứ Diệu Đế' })
      ).not.toBeInTheDocument();
    });

    // And cây chủ đề hiển thị chủ đề B (h3 trong TopicTree)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Chủ đề B - Kiến Trúc Hệ Thống' })
      ).toBeInTheDocument();
    });

    // And không hiển thị chủ đề A trong danh sách đã lọc
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Chủ đề A - Tứ Diệu Đế' })
    ).not.toBeInTheDocument();

    // And lĩnh vực Công Nghệ được đánh dấu đang chọn trong sidebar
    expect(congNgheBtn.className).toMatch(/bg-amber-100|dark:bg-amber-950/);

    // And URL hash không còn chứa topic-a
    await waitFor(() => {
      expect(window.location.hash).toContain('cat=cat-cong-nghe');
      expect(window.location.hash).not.toContain('topic-a');
    });
  });

  it('Scenario 2: Chọn lĩnh vực không có chủ đề', async () => {
    // Given đang mở chi tiết một chủ đề
    window.location.hash = '#/topics/topic-a';
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Chủ đề A - Tứ Diệu Đế' })
      ).toBeInTheDocument();
    });

    const sidebar = screen.getByTestId('app-sidebar-container');
    const kinhDoanhBtn = within(sidebar).getByRole('button', { name: /Kinh Doanh/i });

    // When bấm lĩnh vực Kinh Doanh (lĩnh vực không có chủ đề)
    await new Promise((r) => setTimeout(r, 20));
    await act(async () => {
      fireEvent.click(kinhDoanhBtn);
    });

    // Then thoát màn hình chi tiết chủ đề A
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 1, name: 'Chủ đề A - Tứ Diệu Đế' })
      ).not.toBeInTheDocument();
    });

    // And hiển thị cây chủ đề với trạng thái rỗng tương ứng
    await waitFor(() => {
      expect(screen.getByText('Cây Phân Cấp & Quản Lý Chủ Đề')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Chưa có chủ đề nào trong phân cấp này phù hợp với bộ lọc hiện tại/i)
    ).toBeInTheDocument();

    // And không giữ nội dung chủ đề cũ
    expect(screen.queryByText('Mô tả giáo lý Tứ Diệu Đế cốt lõi')).not.toBeInTheDocument();

    // And URL hash phản ánh bộ lọc cat-kinh-doanh và không có topic-a
    await waitFor(() => {
      expect(window.location.hash).toContain('cat=cat-kinh-doanh');
      expect(window.location.hash).not.toContain('topic-a');
    });
  });

  it('Scenario 3: Bấm lại lĩnh vực đang chọn (toggle off)', async () => {
    // Given bộ lọc Phật Học đang được chọn và đang mở chi tiết chủ đề A
    window.location.hash = '#/topics/topic-a?cat=cat-phat-hoc';
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Chủ đề A - Tứ Diệu Đế' })
      ).toBeInTheDocument();
    });

    const sidebar = screen.getByTestId('app-sidebar-container');
    const phatHocBtn = within(sidebar).getByRole('button', { name: /Phật Học/i });

    // When bấm lại lĩnh vực Phật Học
    await new Promise((r) => setTimeout(r, 20));
    await act(async () => {
      fireEvent.click(phatHocBtn);
    });

    // Then bộ lọc lĩnh vực được bỏ và thoát màn hình chi tiết
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 1, name: 'Chủ đề A - Tứ Diệu Đế' })
      ).not.toBeInTheDocument();
    });

    // And hiển thị cây chủ đề không lọc theo lĩnh vực (hiển thị cả chủ đề A, B, C)
    await waitFor(() => {
      expect(screen.getByText('Cây Phân Cấp & Quản Lý Chủ Đề')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { level: 3, name: 'Chủ đề A - Tứ Diệu Đế' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Chủ đề B - Kiến Trúc Hệ Thống' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Chủ đề C - Dược Tính Đông Y' })
    ).toBeInTheDocument();

    // And URL hash là #/topics (không còn cat hay topic-a)
    await waitFor(() => {
      expect(window.location.hash).toBe('#/topics');
    });
  });

  it('Scenario 4: Chọn lĩnh vực từ tab khác', async () => {
    // Given đang ở tab Tổng quan (dashboard)
    window.location.hash = '#/';
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Tổng Quan Nghiên Cứu/i)).toBeInTheDocument();
    });

    const sidebar = screen.getByTestId('app-sidebar-container');
    const congNgheBtn = within(sidebar).getByRole('button', { name: /Công Nghệ/i });

    // When bấm lĩnh vực Công Nghệ
    await new Promise((r) => setTimeout(r, 20));
    await act(async () => {
      fireEvent.click(congNgheBtn);
    });

    // Then chuyển sang cây chủ đề và áp dụng bộ lọc Công Nghệ
    await waitFor(() => {
      expect(screen.getByText('Cây Phân Cấp & Quản Lý Chủ Đề')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Chủ đề B - Kiến Trúc Hệ Thống' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Chủ đề A - Tứ Diệu Đế' })
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe('#/topics?cat=cat-cong-nghe');
    });
  });

  it('Scenario 5: Chuyển liên tiếp giữa các lĩnh vực', async () => {
    // Given đang xem cây chủ đề của Phật Học
    window.location.hash = '#/topics?cat=cat-phat-hoc';
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Cây Phân Cấp & Quản Lý Chủ Đề')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { level: 3, name: 'Chủ đề A - Tứ Diệu Đế' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Chủ đề B - Kiến Trúc Hệ Thống' })
    ).not.toBeInTheDocument();

    const sidebar = screen.getByTestId('app-sidebar-container');
    const congNgheBtn = within(sidebar).getByRole('button', { name: /Công Nghệ/i });
    const dongYBtn = within(sidebar).getByRole('button', { name: /Đông Y/i });

    // When bấm Công Nghệ rồi bấm Đông Y
    fireEvent.click(congNgheBtn);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Chủ đề B - Kiến Trúc Hệ Thống' })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Chủ đề A - Tứ Diệu Đế' })
    ).not.toBeInTheDocument();

    fireEvent.click(dongYBtn);

    // Then cây chủ đề phản ánh lĩnh vực Đông Y
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'Chủ đề C - Dược Tính Đông Y' })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Chủ đề A - Tứ Diệu Đế' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Chủ đề B - Kiến Trúc Hệ Thống' })
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe('#/topics?cat=cat-dong-y');
    });
  });
});
