import React from 'react';
import { FileText, Terminal, Layers, CheckCircle2 } from 'lucide-react';
import { NotebookLMStepperProps, NotebookLMWorkspaceStep } from './types';
import { WORKSPACE_STEPS } from './utils';

export function NotebookLMStepper({
  activeStep,
  onSelectStep,
  isPromptAvailable,
  hasArtifacts,
  artifactCount,
}: NotebookLMStepperProps) {
  const getStepIcon = (stepId: NotebookLMWorkspaceStep, isCurrent: boolean) => {
    switch (stepId) {
      case 'source':
        return <FileText className="w-3.5 h-3.5" />;
      case 'prompt':
        return <Terminal className="w-3.5 h-3.5" />;
      case 'results':
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <nav
      aria-label="Tiến trình làm việc NotebookLM"
      className="px-6 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
    >
      <ol className="flex items-center justify-between sm:justify-start sm:gap-2">
        {WORKSPACE_STEPS.map((step, index) => {
          const isCurrent = activeStep === step.id;
          const isCompleted =
            (step.id === 'source' && isPromptAvailable) ||
            (step.id === 'prompt' && hasArtifacts);
          const isDisabled = step.id === 'prompt' && !isPromptAvailable;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div
                  aria-hidden="true"
                  className="hidden sm:block w-6 h-px bg-stone-200 dark:bg-stone-800"
                />
              )}
              <li className="flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  disabled={isDisabled}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Bước ${step.stepNumber}: ${step.label} - ${step.description}`}
                  className={`w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isCurrent
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-blue-700 text-white'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      step.stepNumber
                    )}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5">
                    {getStepIcon(step.id, isCurrent)}
                    <span>{step.label}</span>
                  </span>
                  <span className="sm:hidden text-[11px]">{step.label}</span>

                  {step.id === 'results' && artifactCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {artifactCount}
                    </span>
                  )}
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
