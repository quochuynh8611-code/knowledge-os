/**
 * Phase 17B: TopicDetail Toolbar Simplification & Next-Action Hub
 *
 * Test-first suite covering:
 * 1. Toolbar shape: only 4 surface actions, 4 old tools hidden behind dropdown
 * 2. Research Tools dropdown open/close behaviour
 * 3. Smart Study CTA — 3 states (no session / this topic / other topic)
 * 4. Other-topic session guard: must NOT silently switch topics
 * 5. Next-Action Strip messages by status + progress
 *
 * Gherkin: docs/gherkin/phase-17b-topic-detail-toolbar.feature
 * Spec:    docs/specs/phase-17b-topic-detail-toolbar.md
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { Topic, StudyProgress } from '../../src/types';
import { ResearchToolsDropdown } from '../../src/components/topics/ResearchToolsDropdown';
import { StudyCTA } from '../../src/components/topics/StudyCTA';
import { NextActionStrip } from '../../src/components/topics/NextActionStrip';
import { TopicDetail } from '../../src/components/topics/TopicDetail';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeProgress(overrides: Partial<StudyProgress> = {}): StudyProgress {
  return {
    topicId: 'topic-am-duong',
    status: 'in_progress',
    progress: 45,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    totalNotes: 0,
    timeSpent: 30,
    lastStudied: new Date().toISOString(),
    ...overrides,
  };
}

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-am-duong',
    title: 'Học Thuyết Âm Dương',
    slug: 'hoc-thuyet-am-duong',
    categoryId: 'cat-dong-y',
    type: 'dong-y',
    description: 'Học thuyết âm dương trong Đông Y',
    content: '',
    tags: [],
    links: [],
    studyProgress: makeProgress(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Helper: render TopicDetail via DataProvider.
// We cannot easily control DataContext state in unit tests, so we test
// the new sub-components directly where possible, and test TopicDetail
// integration via DataProvider for smoke tests.
function renderTopicDetail() {
  localStorage.clear();
  return render(
    <DataProvider>
      <TopicDetail />
    </DataProvider>
  );
}

// ---------------------------------------------------------------------------
// 1. ResearchToolsDropdown — isolated unit tests
// ---------------------------------------------------------------------------

describe('Phase 17B – 1. ResearchToolsDropdown Component', () => {
  it('1.1. Dropdown trigger renders with correct test-id', () => {
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={vi.fn()}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={vi.fn()}
        onOpenNotebookLM={vi.fn()}
      />
    );
    expect(screen.getByTestId('research-tools-menu-trigger')).toBeInTheDocument();
  });

  it('1.2. Dropdown items are hidden before trigger is clicked', () => {
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={vi.fn()}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={vi.fn()}
        onOpenNotebookLM={vi.fn()}
      />
    );
    expect(screen.queryByTestId('research-tools-menu')).toBeNull();
  });

  it('1.3. Clicking trigger opens dropdown with 4 items', () => {
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={vi.fn()}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={vi.fn()}
        onOpenNotebookLM={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('research-tools-menu-trigger'));
    const menu = screen.getByTestId('research-tools-menu');
    expect(menu).toBeInTheDocument();
    // All 4 tool entries visible
    expect(screen.getByTestId('research-tool-ai-studio')).toBeInTheDocument();
    expect(screen.getByTestId('research-tool-handoff')).toBeInTheDocument();
    expect(screen.getByTestId('research-tool-obsidian')).toBeInTheDocument();
    expect(screen.getByTestId('research-tool-notebooklm')).toBeInTheDocument();
  });

  it('1.4. Clicking AI Studio item fires onOpenAIStudio and closes menu', () => {
    const onOpenAIStudio = vi.fn();
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={onOpenAIStudio}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={vi.fn()}
        onOpenNotebookLM={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('research-tools-menu-trigger'));
    fireEvent.click(screen.getByTestId('research-tool-ai-studio'));
    expect(onOpenAIStudio).toHaveBeenCalledOnce();
    // Menu closes after selection
    expect(screen.queryByTestId('research-tools-menu')).toBeNull();
  });

  it('1.5. Clicking Obsidian item fires onOpenObsidian', () => {
    const onOpenObsidian = vi.fn();
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={vi.fn()}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={onOpenObsidian}
        onOpenNotebookLM={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('research-tools-menu-trigger'));
    fireEvent.click(screen.getByTestId('research-tool-obsidian'));
    expect(onOpenObsidian).toHaveBeenCalledOnce();
  });

  it('1.6. Clicking NotebookLM item fires onOpenNotebookLM', () => {
    const onOpenNotebookLM = vi.fn();
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={vi.fn()}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={vi.fn()}
        onOpenNotebookLM={onOpenNotebookLM}
      />
    );
    fireEvent.click(screen.getByTestId('research-tools-menu-trigger'));
    fireEvent.click(screen.getByTestId('research-tool-notebooklm'));
    expect(onOpenNotebookLM).toHaveBeenCalledOnce();
  });

  it('1.7. Second click on trigger closes the dropdown (toggle)', () => {
    render(
      <ResearchToolsDropdown
        onOpenAIStudio={vi.fn()}
        onOpenHandoff={vi.fn()}
        onOpenObsidian={vi.fn()}
        onOpenNotebookLM={vi.fn()}
      />
    );
    const trigger = screen.getByTestId('research-tools-menu-trigger');
    fireEvent.click(trigger); // open
    expect(screen.getByTestId('research-tools-menu')).toBeInTheDocument();
    fireEvent.click(trigger); // close
    expect(screen.queryByTestId('research-tools-menu')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. StudyCTA — isolated unit tests (smart primary CTA)
// ---------------------------------------------------------------------------

describe('Phase 17B – 2. StudyCTA Component', () => {
  const defaultProps = {
    topicId: 'topic-am-duong',
    topicTitle: 'Học Thuyết Âm Dương',
    activeTimerTopicId: null as string | null,
    isTimerRunning: false,
    timerSeconds: 0,
    onStartStudy: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('2.1. Khi không có active session: hiện "Bắt đầu học"', () => {
    render(<StudyCTA {...defaultProps} activeTimerTopicId={null} />);
    const btn = screen.getByTestId('study-cta-btn');
    expect(btn).toHaveTextContent(/Bắt đầu học/i);
    expect(btn).not.toBeDisabled();
  });

  it('2.2. Click CTA khi không có session gọi onStartStudy với đúng topicId', () => {
    const onStartStudy = vi.fn();
    render(<StudyCTA {...defaultProps} activeTimerTopicId={null} onStartStudy={onStartStudy} />);
    fireEvent.click(screen.getByTestId('study-cta-btn'));
    expect(onStartStudy).toHaveBeenCalledWith('topic-am-duong');
  });

  it('2.3. Khi activeTimerTopicId === topic.id: hiện "Đang học..." (không gọi onStartStudy)', () => {
    const onStartStudy = vi.fn();
    render(
      <StudyCTA
        {...defaultProps}
        activeTimerTopicId="topic-am-duong"
        isTimerRunning={true}
        timerSeconds={180}
        onStartStudy={onStartStudy}
      />
    );
    const btn = screen.getByTestId('study-cta-btn');
    expect(btn).toHaveTextContent(/Đang học/i);
    // Click should NOT call onStartStudy (button is informational when same topic)
    fireEvent.click(btn);
    expect(onStartStudy).not.toHaveBeenCalled();
  });

  it('2.4. GUARD: khi có active session cho TOPIC KHÁC, CTA hiện cảnh báo và KHÔNG tự động start', () => {
    const onStartStudy = vi.fn();
    render(
      <StudyCTA
        {...defaultProps}
        topicId="topic-am-duong"
        activeTimerTopicId="topic-ngu-hanh"
        isTimerRunning={true}
        timerSeconds={300}
        onStartStudy={onStartStudy}
      />
    );
    const btn = screen.getByTestId('study-cta-btn');
    // Must show conflict indicator — NOT hide silently or auto-switch
    expect(btn).toHaveTextContent(/Phiên khác đang chạy|Đang học chủ đề khác|Chuyển sang học/i);
    // Clicking the button must NOT immediately call onStartStudy (would destroy other session)
    // The button should open a confirmation step or be informational only
    fireEvent.click(btn);
    expect(onStartStudy).not.toHaveBeenCalled();
  });

  it('2.5. Khi paused ở topic này: hiện "Tiếp tục học" và click gọi onResumeStudy', () => {
    const onResumeStudy = vi.fn();
    const onStartStudy = vi.fn();
    render(
      <StudyCTA
        {...defaultProps}
        activeTimerTopicId="topic-am-duong"
        isTimerRunning={false}
        timerSeconds={120}
        onStartStudy={onStartStudy}
        onResumeStudy={onResumeStudy}
      />
    );
    const btn = screen.getByTestId('study-cta-btn');
    expect(btn).toHaveTextContent(/Tiếp tục học/i);
    fireEvent.click(btn);
    expect(onResumeStudy).toHaveBeenCalledOnce();
    expect(onStartStudy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. NextActionStrip — isolated unit tests
// ---------------------------------------------------------------------------

describe('Phase 17B – 3. NextActionStrip Component', () => {
  it('3.1. not_started: hiện gợi ý bắt đầu phiên học đầu tiên', () => {
    render(<NextActionStrip topic={makeTopic({ studyProgress: makeProgress({ status: 'not_started', progress: 0 }) })} />);
    expect(screen.getByTestId('next-action-strip')).toHaveTextContent(/bắt đầu|phiên học/i);
  });

  it('3.2. in_progress progress < 50: gợi ý tiếp tục nghiên cứu', () => {
    render(<NextActionStrip topic={makeTopic({ studyProgress: makeProgress({ status: 'in_progress', progress: 35 }) })} />);
    const strip = screen.getByTestId('next-action-strip');
    expect(strip).toHaveTextContent(/tiếp tục|nghiên cứu|ghi chú/i);
  });

  it('3.3. in_progress progress >= 50: gợi ý ôn tập SM-2', () => {
    render(<NextActionStrip topic={makeTopic({ studyProgress: makeProgress({ status: 'in_progress', progress: 65 }) })} />);
    const strip = screen.getByTestId('next-action-strip');
    expect(strip).toHaveTextContent(/ôn tập|củng cố/i);
  });

  it('3.4. completed: gợi ý ôn tập định kỳ', () => {
    render(<NextActionStrip topic={makeTopic({ studyProgress: makeProgress({ status: 'completed', progress: 100 }) })} />);
    const strip = screen.getByTestId('next-action-strip');
    expect(strip).toHaveTextContent(/hoàn thành|ôn tập định kỳ|duy trì/i);
  });
});

// ---------------------------------------------------------------------------
// 4. TopicDetail integration — toolbar shape (smoke)
// ---------------------------------------------------------------------------

describe('Phase 17B – 4. TopicDetail Toolbar Shape (Integration Smoke)', () => {
  it('4.1. TopicDetail renders without crashing when no topic selected', () => {
    const { container } = renderTopicDetail();
    expect(container).toBeTruthy();
  });

  it('4.2. Exports spec: ResearchToolsDropdown, StudyCTA, NextActionStrip exist', () => {
    expect(typeof ResearchToolsDropdown).toBe('function');
    expect(typeof StudyCTA).toBe('function');
    expect(typeof NextActionStrip).toBe('function');
  });
});
