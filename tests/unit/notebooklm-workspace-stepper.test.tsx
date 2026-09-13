import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotebookLMHeader } from '../../src/components/integrations/notebooklm/NotebookLMHeader';
import { NotebookLMStepper } from '../../src/components/integrations/notebooklm/NotebookLMStepper';

describe('NotebookLM Header & Stepper Unit Tests (Slice 2)', () => {
  it('1. Header renders title "NotebookLM", subtitle and invokes onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<NotebookLMHeader onClose={handleClose} topicTitle="Kỳ Môn Độn Giáp" />);

    expect(screen.getByRole('heading', { name: /NotebookLM/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Chuẩn bị nguồn, tạo prompt và nhập kết quả nghiên cứu/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Kỳ Môn Độn Giáp/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Đóng modal/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('2. Stepper renders all 3 steps and marks the active step with aria-current="step"', () => {
    const handleSelectStep = vi.fn();
    render(
      <NotebookLMStepper
        activeStep="source"
        onSelectStep={handleSelectStep}
        isPromptAvailable={true}
        hasArtifacts={false}
        artifactCount={0}
      />
    );

    const sourceStepBtn = screen.getByRole('button', { name: /Bước 1: Nguồn/i });
    const promptStepBtn = screen.getByRole('button', { name: /Bước 2: Prompt/i });
    const resultsStepBtn = screen.getByRole('button', { name: /Bước 3: Kết quả/i });

    expect(sourceStepBtn).toHaveAttribute('aria-current', 'step');
    expect(promptStepBtn).not.toHaveAttribute('aria-current');
    expect(resultsStepBtn).not.toHaveAttribute('aria-current');

    fireEvent.click(promptStepBtn);
    expect(handleSelectStep).toHaveBeenCalledWith('prompt');
  });

  it('3. Stepper disables Prompt step button when isPromptAvailable is false', () => {
    const handleSelectStep = vi.fn();
    render(
      <NotebookLMStepper
        activeStep="source"
        onSelectStep={handleSelectStep}
        isPromptAvailable={false}
        hasArtifacts={false}
        artifactCount={0}
      />
    );

    const promptStepBtn = screen.getByRole('button', { name: /Bước 2: Prompt/i });
    expect(promptStepBtn).toBeDisabled();

    fireEvent.click(promptStepBtn);
    expect(handleSelectStep).not.toHaveBeenCalled();
  });

  it('4. Stepper displays artifact count badge on Results step when count > 0', () => {
    render(
      <NotebookLMStepper
        activeStep="results"
        onSelectStep={vi.fn()}
        isPromptAvailable={true}
        hasArtifacts={true}
        artifactCount={5}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
