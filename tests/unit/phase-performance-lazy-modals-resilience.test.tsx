import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { Navbar } from '../../src/components/layout/Navbar';
import { TopicDetail } from '../../src/components/topics/TopicDetail';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';

describe('Phase Performance: Lazy Modals Suspense & Lifecycle Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. Navbar lazy modals (Obsidian, NotebookLM, Handoff) open, close, and re-open cleanly under Suspense', async () => {
    render(
      <DataProvider>
        <Navbar onOpenCommandPalette={vi.fn()} onOpenShortcutsModal={vi.fn()} />
      </DataProvider>
    );

    // 1.1. Open and close ObsidianBridgeModal
    const obsidianBtn = screen.getByTitle(/Đồng bộ Obsidian Vault/i);
    expect(obsidianBtn).toBeInTheDocument();
    fireEvent.click(obsidianBtn);

    const obsidianTitle = await screen.findByText(/Obsidian Real-Time Vault Bridge/i);
    expect(obsidianTitle).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đóng modal/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Obsidian Real-Time Vault Bridge/i)).toBeNull();
    });

    // Re-open ObsidianBridgeModal
    fireEvent.click(obsidianBtn);
    expect(await screen.findByText(/Obsidian Real-Time Vault Bridge/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Đóng modal/i }));

    // 1.2. Open and close NotebookLMStudioModal
    const notebookLMBtn = screen.getByTitle(/Google NotebookLM/i);
    fireEvent.click(notebookLMBtn);

    const notebookLMTitle = await screen.findByText(/Google NotebookLM Research Hub/i);
    expect(notebookLMTitle).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đóng modal/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Google NotebookLM Research Hub/i)).toBeNull();
    });

    // 1.3. Open and close AntigravityHandoffModal
    const handoffBtn = screen.getByTitle(/Antigravity AI Handoff/i);
    fireEvent.click(handoffBtn);

    const handoffTitle = await screen.findByText(/Antigravity AI Scholar Handoff Bundle/i);
    expect(handoffTitle).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đóng modal/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Antigravity AI Scholar Handoff Bundle/i)).toBeNull();
    });
  });

  it('2. AIResearchStudio lazy Handoff modal mounts with Suspense and receives active topic', async () => {
    const mockTopic = {
      id: 'topic-test-ai',
      title: 'Kinh Tế Học Vĩ Mô',
      slug: 'kinh-te-hoc-vi-mo',
      description: 'Tổng quan kinh tế vĩ mô',
      content: 'Nội dung nghiên cứu kinh tế vĩ mô',
      type: 'other' as const,
      categoryId: 'cat-kinh-te',
      categoryName: 'Kinh Tế Học',
      tags: ['KinhTe', 'ViMo'],
      links: [],
      studyProgress: {
        topicId: 'topic-test-ai',
        status: 'in_progress' as const,
        progress: 50,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    const openHandoffBtn = screen.getByTitle(/Đóng gói Handoff Bundle 6 phần cho Reasoning AI/i);
    expect(openHandoffBtn).toBeInTheDocument();

    fireEvent.click(openHandoffBtn);

    const handoffTitle = await screen.findByText(/Antigravity AI Scholar Handoff Bundle/i);
    expect(handoffTitle).toBeInTheDocument();

    // Verify active topic title is rendered inside the modal
    expect(screen.getAllByText(/Kinh Tế Học Vĩ Mô/i).length).toBeGreaterThan(0);

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Đóng modal/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Antigravity AI Scholar Handoff Bundle/i)).toBeNull();
    });
  });
});
