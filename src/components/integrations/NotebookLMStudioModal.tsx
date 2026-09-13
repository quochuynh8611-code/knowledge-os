import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useData } from '../../context/DataContext';
import {
  packageSourceForNotebookLM,
  generateNotebookLMTaskPrompt,
  validateArtifactImportInput,
  parseArtifactMarkdownFile,
  getStoredArtifacts,
  saveArtifact,
  deleteArtifact,
  NotebookLMArtifact,
  NotebookLMArtifactType,
} from '../../lib/notebooklm';
import {
  createAntigravityHandoffJob,
  buildAntigravityCLICommand,
  getStoredHandoffJobs,
  saveHandoffJob,
  deleteHandoffJob,
  completeMatchingHandoffJob,
  AntigravityHandoffJob,
} from '../../lib/antigravityPipeline';
import { sanitizeFileName } from '../../lib/obsidian';
import { Topic } from '../../types';
import { ResearchSessionDTO, GroundedArtifactDTO } from '../../types/researchHub';
import { ArtifactReviewDrawer } from './ArtifactReviewDrawer';
import { NotebookLMWorkspaceStep } from './notebooklm/types';
import { NotebookLMHeader } from './notebooklm/NotebookLMHeader';
import { NotebookLMStepper } from './notebooklm/NotebookLMStepper';
import { NotebookLMSourceStep } from './notebooklm/NotebookLMSourceStep';
import { NotebookLMPromptStep } from './notebooklm/NotebookLMPromptStep';
import { NotebookLMResultsStep } from './notebooklm/NotebookLMResultsStep';
import { AdvancedTechnicalDetails } from './notebooklm/AdvancedTechnicalDetails';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface NotebookLMStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
}

export function NotebookLMStudioModal({ isOpen, onClose, topic }: NotebookLMStudioModalProps) {
  const { topics, notes, resources } = useData();

  // 1. Core Workflow Navigation State
  const [activeStep, setActiveStep] = useState<NotebookLMWorkspaceStep>('source');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topic?.id || topics[0]?.id || ''
  );
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // 2. Feedback & Submitting States
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);
  const [isHandoffSubmitting, setIsHandoffSubmitting] = useState(false);

  // 3. Backend Research Session State
  const [currentSession, setCurrentSession] = useState<ResearchSessionDTO | null>(null);
  const [sessionArtifacts, setSessionArtifacts] = useState<GroundedArtifactDTO[]>([]);

  // 4. Task Prompt State
  const [promptArtifactType, setPromptArtifactType] = useState<NotebookLMArtifactType>('study_guide');
  const [customInstructions, setCustomInstructions] = useState('');

  // 5. Antigravity Pipeline State
  const [handoffJobs, setHandoffJobs] = useState<AntigravityHandoffJob[]>([]);
  const [activeJob, setActiveJob] = useState<AntigravityHandoffJob | null>(null);

  // 6. Artifact Locker State
  const [localArtifacts, setLocalArtifacts] = useState<NotebookLMArtifact[]>([]);
  const [showAddArtifact, setShowAddArtifact] = useState(false);
  const [artifactType, setArtifactType] = useState<NotebookLMArtifactType>('audio_overview_summary');
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactContent, setArtifactContent] = useState('');
  const [notebookUrl, setNotebookUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // 7. Review Drawer State
  const [reviewingArtifact, setReviewingArtifact] = useState<GroundedArtifactDTO | null>(null);

  // Focus trap ref
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(modalContainerRef, isOpen, {
    initialFocusRef,
    onEscape: onClose,
    returnFocus: true,
  });

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topic || topics[0];

  // Fetch or create research session on topic change
  const syncSession = useCallback(async (topicId: string) => {
    try {
      const res = await fetch('/api/research-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSession(data);
        if (data.artifacts) {
          setSessionArtifacts(
            data.artifacts.map((a: any) => ({
              ...a,
              sourcePackageVersion: a.sourcePackage?.version || 1,
            }))
          );
        }
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Sync selectedTopicId when modal is opened or topic prop changes
  useEffect(() => {
    if (isOpen && topic?.id) {
      setSelectedTopicId(topic.id);
    }
  }, [isOpen, topic?.id]);

  useEffect(() => {
    if (isOpen) {
      setLocalArtifacts(getStoredArtifacts());
      setHandoffJobs(getStoredHandoffJobs());
      setValidationError(null);
      if (currentTopic) {
        syncSession(currentTopic.id);
      }
    }
  }, [isOpen, currentTopic?.id, syncSession]);

  if (!isOpen) return null;

  // Derived Documents & Prompts
  const sourceDocument = currentTopic
    ? packageSourceForNotebookLM(currentTopic, notes, resources)
    : '';

  const taskPrompt = currentTopic
    ? generateNotebookLMTaskPrompt(currentTopic, promptArtifactType, customInstructions)
    : '';

  // Topic Artifact Count for stepper badge
  const displayLocalArtifacts = localArtifacts.filter((a) => a.topicId === currentTopic?.id);
  const displaySessionArtifacts = sessionArtifacts.filter((a) => a.topicId === currentTopic?.id);
  const currentTopicArtifactCount =
    displayLocalArtifacts.length +
    displaySessionArtifacts.filter(
      (sa) => !displayLocalArtifacts.some((la) => la.title === sa.title)
    ).length;

  // Handlers
  const handleCopySource = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sourceDocument);
      }
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);

      if (currentSession && currentTopic) {
        await fetch(`/api/research-sessions/${currentSession.id}/package-sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: sourceDocument,
            sourceCount:
              notes.filter((n) => n.topicId === currentTopic.id).length +
              resources.filter((r) => r.topicId === currentTopic.id).length,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to copy source to clipboard', err);
    }
  };

  const handleDownloadSourceFile = async () => {
    if (!currentTopic) return;
    const blob = new Blob([sourceDocument], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NotebookLM-Source-${sanitizeFileName(currentTopic.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);

    if (currentSession) {
      try {
        await fetch(`/api/research-sessions/${currentSession.id}/package-sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: sourceDocument,
            sourceCount:
              notes.filter((n) => n.topicId === currentTopic.id).length +
              resources.filter((r) => r.topicId === currentTopic.id).length,
          }),
        }).catch(() => {});
      } catch (e) {
        console.error('Failed to sync source package', e);
      }
    }
  };

  const handleOpenNotebookLM = () => {
    window.open('https://notebooklm.google.com/', '_blank', 'noopener,noreferrer');
  };

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(taskPrompt);
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);

      if (currentSession) {
        await fetch(`/api/research-sessions/${currentSession.id}/task-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promptMode: promptArtifactType,
            promptText: taskPrompt,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to copy prompt to clipboard', err);
    }
  };

  const handlePrepareHandoff = async () => {
    if (!currentTopic || isHandoffSubmitting) return;

    setIsHandoffSubmitting(true);
    try {
      const { job } = createAntigravityHandoffJob(
        currentTopic,
        promptArtifactType,
        customInstructions,
        notes,
        resources
      );
      saveHandoffJob(job);
      setActiveJob(job);
      setHandoffJobs(getStoredHandoffJobs());

      if (currentSession) {
        try {
          const cliCmd = buildAntigravityCLICommand(job);
          await fetch(`/api/research-sessions/${currentSession.id}/task-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              promptMode: promptArtifactType,
              promptText: taskPrompt,
              cliCommandHint: cliCmd,
            }),
          }).catch(() => {});
        } catch (e) {
          console.error('Failed to sync prompt to session', e);
        }
      }
    } finally {
      setIsHandoffSubmitting(false);
    }
  };

  const handleCopyCLICommand = async (jobToCopy?: AntigravityHandoffJob) => {
    const target = jobToCopy || activeJob || handoffJobs[0];
    if (!target) return;
    const cmd = buildAntigravityCLICommand(target);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cmd);
      }
      setCopiedCliCommand(true);
      setTimeout(() => setCopiedCliCommand(false), 2000);
    } catch (err) {
      console.error('Failed to copy CLI command', err);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    deleteHandoffJob(jobId);
    setHandoffJobs(getStoredHandoffJobs());
    if (activeJob?.jobId === jobId) {
      setActiveJob(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTopic) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseArtifactMarkdownFile(text, currentTopic.id);
        setArtifactTitle(parsed.title);
        setArtifactContent(parsed.content);
        setArtifactType(parsed.type);
        setShowAddArtifact(true);
        setValidationError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveNewArtifact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTopic) return;

    const validation = validateArtifactImportInput({
      topicId: currentTopic.id,
      title: artifactTitle,
      content: artifactContent,
      notebookUrl: notebookUrl || undefined,
    });

    if (!validation.valid) {
      setValidationError(validation.error || 'Dữ liệu không hợp lệ.');
      return;
    }

    setValidationError(null);

    // Save to local storage for backward compatibility & offline preview
    const savedLocal = saveArtifact({
      topicId: currentTopic.id,
      type: artifactType,
      title: validation.sanitized!.title,
      content: validation.sanitized!.content,
      notebookUrl: validation.sanitized!.notebookUrl,
      source: 'antigravity-2.0',
      target: 'notebooklm',
      status: 'imported',
    });
    setLocalArtifacts((prev) => [savedLocal, ...prev]);

    const completedJob = completeMatchingHandoffJob({
      topicId: currentTopic.id,
      artifactType,
    });
    if (completedJob) {
      setHandoffJobs(getStoredHandoffJobs());
      if (activeJob?.jobId === completedJob.jobId) {
        setActiveJob(completedJob);
      }
    }

    // Save to backend if session is active
    if (currentSession) {
      try {
        const latestPackage = currentSession.sourcePackages?.[0];
        const latestPrompt = currentSession.taskPrompts?.[0];

        const res = await fetch('/api/artifacts/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            sourcePackageId: latestPackage?.id || null,
            taskPromptId: latestPrompt?.id || null,
            topicId: currentTopic.id,
            artifactType: artifactType === 'audio_overview_summary' ? 'study_guide' : artifactType,
            title: validation.sanitized!.title,
            rawContent: validation.sanitized!.content,
            metadata: {
              notebookUrl: validation.sanitized!.notebookUrl || null,
              source: 'antigravity-2.0',
              target: 'notebooklm',
            },
          }),
        });

        if (res.ok) {
          const { artifact } = await res.json();
          setSessionArtifacts((prev) => [
            { ...artifact, sourcePackageVersion: latestPackage?.version || 1 },
            ...prev,
          ]);
        }
      } catch (err) {
        console.error('Failed to ingest artifact to backend', err);
      }
    }

    setShowAddArtifact(false);
    setArtifactTitle('');
    setArtifactContent('');
    setNotebookUrl('');
  };

  const handleDeleteLocalArtifact = (id: string) => {
    deleteArtifact(id);
    setLocalArtifacts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleArtifactUpdated = (updated: GroundedArtifactDTO) => {
    setSessionArtifacts((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
    if (reviewingArtifact?.id === updated.id) {
      setReviewingArtifact({ ...reviewingArtifact, ...updated });
    }
  };

  return (
    <div
      ref={modalContainerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notebooklm-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100">
        {/* 1. Header Tinh Gọn */}
        <NotebookLMHeader
          onClose={onClose}
          topicTitle={currentTopic?.title}
        />

        {/* 2. Stepper Ba Bước */}
        <NotebookLMStepper
          activeStep={activeStep}
          onSelectStep={(step) => setActiveStep(step)}
          isPromptAvailable={Boolean(currentTopic)}
          hasArtifacts={currentTopicArtifactCount > 0}
          artifactCount={currentTopicArtifactCount}
        />

        {/* 3. Main Step View Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs text-stone-700 dark:text-stone-300 bg-stone-50/40 dark:bg-stone-900/40">
          {activeStep === 'source' && (
            <NotebookLMSourceStep
              currentTopic={currentTopic}
              topics={topics}
              selectedTopicId={selectedTopicId}
              onSelectTopicId={setSelectedTopicId}
              showAllTopics={showAllTopics}
              onToggleShowAllTopics={() => setShowAllTopics(!showAllTopics)}
              notes={notes}
              resources={resources}
              sourceDocument={sourceDocument}
              copiedSource={copiedSource}
              onCopySource={handleCopySource}
              onDownloadSourceFile={handleDownloadSourceFile}
              onOpenNotebookLM={handleOpenNotebookLM}
              onProceedToPrompt={() => setActiveStep('prompt')}
            />
          )}

          {activeStep === 'prompt' && (
            <NotebookLMPromptStep
              currentTopic={currentTopic}
              promptArtifactType={promptArtifactType}
              onSelectArtifactType={setPromptArtifactType}
              customInstructions={customInstructions}
              onChangeCustomInstructions={setCustomInstructions}
              taskPrompt={taskPrompt}
              copiedPrompt={copiedPrompt}
              onCopyPrompt={handleCopyPrompt}
              isHandoffSubmitting={isHandoffSubmitting}
              onPrepareHandoff={handlePrepareHandoff}
              onProceedToResults={() => setActiveStep('results')}
              onBackToSource={() => setActiveStep('source')}
            />
          )}

          {activeStep === 'results' && (
            <NotebookLMResultsStep
              currentTopic={currentTopic}
              localArtifacts={localArtifacts}
              sessionArtifacts={sessionArtifacts}
              currentSession={currentSession}
              showAddArtifact={showAddArtifact}
              onToggleShowAddArtifact={() => setShowAddArtifact(!showAddArtifact)}
              artifactType={artifactType}
              onSelectArtifactType={setArtifactType}
              artifactTitle={artifactTitle}
              onChangeArtifactTitle={setArtifactTitle}
              artifactContent={artifactContent}
              onChangeArtifactContent={setArtifactContent}
              notebookUrl={notebookUrl}
              onChangeNotebookUrl={setNotebookUrl}
              validationError={validationError}
              onSaveNewArtifact={handleSaveNewArtifact}
              onCancelAddArtifact={() => {
                setShowAddArtifact(false);
                setValidationError(null);
              }}
              onFileUpload={handleFileUpload}
              onDeleteLocalArtifact={handleDeleteLocalArtifact}
              onReviewArtifact={(art) => setReviewingArtifact(art)}
              onSelectTopicId={setSelectedTopicId}
              allTopics={topics}
              onBackToPrompt={() => setActiveStep('prompt')}
            />
          )}

          {/* 4. Advanced Technical Details (Collapsible) */}
          <AdvancedTechnicalDetails
            isOpen={isAdvancedOpen}
            onToggleOpen={() => setIsAdvancedOpen(!isAdvancedOpen)}
            activeJob={activeJob}
            handoffJobs={handoffJobs}
            currentSession={currentSession}
            copiedCliCommand={copiedCliCommand}
            onCopyCliCommand={handleCopyCLICommand}
            onDeleteJob={handleDeleteJob}
          />
        </div>
      </div>

      {/* 5. Dedicated Review Drawer */}
      <ArtifactReviewDrawer
        artifact={reviewingArtifact}
        isOpen={Boolean(reviewingArtifact)}
        onClose={() => setReviewingArtifact(null)}
        onArtifactUpdated={handleArtifactUpdated}
        onNoteCreated={() => {
          if (currentTopic) syncSession(currentTopic.id);
        }}
        onFlashcardsCreated={() => {
          if (currentTopic) syncSession(currentTopic.id);
        }}
      />
    </div>
  );
}
