import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  packageSourceForNotebookLM,
  generateNotebookLMTaskPrompt,
  validateArtifactImportInput,
  parseArtifactMarkdownFile,
  getStoredArtifacts,
  saveArtifact,
  updateStoredArtifact,
  computeArtifactContentHash,
  deleteArtifact,
  NotebookLMArtifact,
  NotebookLMArtifactType,
  deduplicateArtifacts,
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
import { logStructuredEvent } from '../../lib/security';
import { Topic } from '../../types';
import { ResearchSessionDTO, GroundedArtifactDTO } from '../../types/researchHub';
import { ArtifactReviewDrawer } from './ArtifactReviewDrawer';
import {
  NotebookLMWorkspaceStep,
  NotebookLMRuntimeStatus,
  DirectExecutionResponseDTO,
} from './notebooklm/types';
import { NotebookLMHeader } from './notebooklm/NotebookLMHeader';
import { NotebookLMStepper } from './notebooklm/NotebookLMStepper';
import { NotebookLMSourceStep } from './notebooklm/NotebookLMSourceStep';
import { NotebookLMPromptStep } from './notebooklm/NotebookLMPromptStep';
import { NotebookLMResultsStep } from './notebooklm/NotebookLMResultsStep';
import { AdvancedTechnicalDetails } from './notebooklm/AdvancedTechnicalDetails';
import { mapLocalArtifactTypeToDTO } from './notebooklm/utils';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface NotebookLMStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
  runtimeStatus?: NotebookLMRuntimeStatus;
}

export function NotebookLMStudioModal({
  isOpen,
  onClose,
  topic,
  runtimeStatus = 'unknown',
}: NotebookLMStudioModalProps) {
  const {
    topics,
    notes,
    resources,
    researchExcerpts = [],
    reloadAllData,
    openFlashcardReview,
  } = useData();

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
  const [suggestedArtifactType, setSuggestedArtifactType] = useState<NotebookLMArtifactType | null>(null);
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactContent, setArtifactContent] = useState('');
  const [notebookUrl, setNotebookUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // 7. Live Direct Execution State
  const [isLiveExecuting, setIsLiveExecuting] = useState(false);
  const [liveExecutionError, setLiveExecutionError] = useState<string | null>(null);

  // 8. Review Drawer State
  const [reviewingArtifact, setReviewingArtifact] = useState<GroundedArtifactDTO | null>(null);

  // 9. Sync Warning State
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  // Focus trap ref
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  // Session idempotency and abort controller refs
  const currentSessionRef = useRef<ResearchSessionDTO | null>(null);
  const activeSyncAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useFocusTrap(modalContainerRef, isOpen, {
    initialFocusRef,
    onEscape: onClose,
    returnFocus: true,
  });

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topic || topics[0];

  // Fetch or create research session on topic change with idempotency & abort guard
  const syncSession = useCallback(async (topicId: string, force = false) => {
    if (!topicId) return;

    // Do not re-request if the current active session already matches topicId unless forced reconciliation
    if (!force && currentSessionRef.current?.topicId === topicId) {
      return;
    }

    // Cancel previous pending session request to avoid race conditions when switching topics rapidly
    if (activeSyncAbortControllerRef.current) {
      activeSyncAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeSyncAbortControllerRef.current = controller;

    try {
      const res = await fetch('/api/research-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSession(data);
        currentSessionRef.current = data;
        if (data.artifacts) {
          setSessionArtifacts((prev) => {
            const dbArtifacts: GroundedArtifactDTO[] = data.artifacts.map((a: any) => ({
              ...a,
              sourcePackageVersion: a.sourcePackage?.version || 1,
            }));
            const map = new Map<string, GroundedArtifactDTO>();
            for (const item of prev) {
              map.set(item.id, item);
            }
            for (const item of dbArtifacts) {
              map.set(item.id, item);
            }
            return Array.from(map.values());
          });
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      // Offline fallback
    } finally {
      if (activeSyncAbortControllerRef.current === controller) {
        activeSyncAbortControllerRef.current = null;
      }
    }
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (activeSyncAbortControllerRef.current) {
        activeSyncAbortControllerRef.current.abort();
      }
    };
  }, []);

  const getOrEnsureSession = async (topicId: string): Promise<ResearchSessionDTO | null> => {
    if (currentSessionRef.current && currentSessionRef.current.topicId === topicId) {
      return currentSessionRef.current;
    }
    try {
      const res = await fetch('/api/research-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSession(data);
        currentSessionRef.current = data;
        return data;
      }
    } catch {
      // offline
    }
    return null;
  };

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
    ? packageSourceForNotebookLM(currentTopic, notes, resources, researchExcerpts)
    : '';

  const taskPrompt = currentTopic
    ? generateNotebookLMTaskPrompt(currentTopic, promptArtifactType, customInstructions)
    : '';

  // Topic Artifact Count for stepper badge
  const displayLocalArtifacts = localArtifacts.filter((a) => a.topicId === currentTopic?.id);
  const displaySessionArtifacts = sessionArtifacts.filter((a) => a.topicId === currentTopic?.id);
  const currentTopicArtifactCount = deduplicateArtifacts(
    displaySessionArtifacts,
    displayLocalArtifacts
  ).count;

  const currentTopicExcerptsCount = currentTopic
    ? researchExcerpts.filter((e) => e.topicId === currentTopic.id).length
    : 0;

  // Handlers
  const handleCopySource = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sourceDocument);
      }
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);

      if (currentTopic) {
        const session = await getOrEnsureSession(currentTopic.id);
        if (session) {
          try {
            const res = await fetch(`/api/research-sessions/${session.id}/package-sources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: sourceDocument,
                sourceCount:
                  notes.filter((n) => n.topicId === currentTopic.id).length +
                  resources.filter((r) => r.topicId === currentTopic.id).length +
                  currentTopicExcerptsCount,
              }),
            });
            if (!res.ok) {
              setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
            } else {
              setSyncWarning(null);
            }
          } catch {
            setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
          }
        } else {
          setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
        }
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

    const session = await getOrEnsureSession(currentTopic.id);
    if (session) {
      try {
        const res = await fetch(`/api/research-sessions/${session.id}/package-sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: sourceDocument,
            sourceCount:
              notes.filter((n) => n.topicId === currentTopic.id).length +
              resources.filter((r) => r.topicId === currentTopic.id).length +
              currentTopicExcerptsCount,
          }),
        });
        if (!res.ok) {
          setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
        } else {
          setSyncWarning(null);
        }
      } catch (e) {
        console.error('Failed to sync source package', e);
        setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
      }
    } else {
      setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
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

      if (currentTopic) {
        const session = await getOrEnsureSession(currentTopic.id);
        if (session) {
          try {
            const res = await fetch(`/api/research-sessions/${session.id}/task-prompt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                promptMode: promptArtifactType,
                promptText: taskPrompt,
              }),
            });
            if (!res.ok) {
              setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
            } else {
              setSyncWarning(null);
            }
          } catch {
            setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
          }
        } else {
          setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
        }
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

      const session = await getOrEnsureSession(currentTopic.id);
      if (session) {
        try {
          const cliCmd = buildAntigravityCLICommand(job);
          const res = await fetch(`/api/research-sessions/${session.id}/task-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              promptMode: promptArtifactType,
              promptText: taskPrompt,
              cliCommandHint: cliCmd,
            }),
          });
          if (!res.ok) {
            setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
          } else {
            setSyncWarning(null);
          }
        } catch (e) {
          console.error('Failed to sync prompt to session', e);
          setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
        }
      } else {
        setSyncWarning('Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu.');
      }
    } finally {
      setIsHandoffSubmitting(false);
    }
  };

  const handleExecuteLiveResearch = async () => {
    if (!currentTopic || !currentSession || isLiveExecuting) return;

    if (promptArtifactType === 'audio_overview_summary') {
      setLiveExecutionError(
        'Loại artifact này (Audio Overview) chưa hỗ trợ thực thi trực tiếp; hãy dùng "Chuẩn bị Handoff Antigravity".'
      );
      return;
    }

    const hasActualSourceContent =
      Boolean(currentTopic.description && currentTopic.description.trim().length > 0) ||
      Boolean(currentTopic.content && currentTopic.content.trim().length > 0) ||
      notes.some((n) => n.topicId === currentTopic.id) ||
      resources.some((r) => r.topicId === currentTopic.id) ||
      currentTopicExcerptsCount > 0 ||
      Boolean(currentSession.sourcePackages && currentSession.sourcePackages.length > 0);

    if (!hasActualSourceContent) {
      setLiveExecutionError(
        'Vui lòng chuẩn bị tài liệu nguồn ở Bước 1 trước khi thực hiện khảo cứu trực tiếp.'
      );
      return;
    }

    setIsLiveExecuting(true);
    setLiveExecutionError(null);

    try {
      const res = await fetch(`/api/research-sessions/${currentSession.id}/execute-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredProviderId: 'notebooklm-enterprise',
          promptArtifactType,
          customInstructions: customInstructions || undefined,
          ephemeralWorkspace: true,
          sources: [
            {
              type: 'inline-text',
              sourceId: `client-src-${currentTopic.id}`,
              title: `Tài liệu nguồn: ${currentTopic.title}`,
              mimeType: 'text/markdown',
              textContent: sourceDocument,
            },
          ],
        }),
      });

      const data: DirectExecutionResponseDTO & { error?: string; code?: string } =
        await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          if (
            data.code === 'AUTHENTICATION_FAILED' ||
            data.code === 'PERMISSION_DENIED'
          ) {
            setLiveExecutionError(
              data.error ||
                '🔒 Xác thực NotebookLM thất bại hoặc phiên đăng nhập hết hạn. Vui lòng kiểm tra cookie hoặc chạy nlm login.'
            );
          } else {
            setLiveExecutionError(
              '🔒 Tính năng Khảo cứu trực tiếp qua MCP chưa được kích hoạt trên hệ thống (Gating: NOTEBOOKLM_DIRECT_EXECUTION flag is OFF). Bạn có thể tiếp tục bằng cách bấm "Chuẩn bị Handoff Antigravity".'
            );
          }
        } else if (res.status === 404) {
          setLiveExecutionError(
            data.error || 'Phiên nghiên cứu không tồn tại trên hệ thống.'
          );
        } else if (res.status === 502 || res.status === 503) {
          if (data.code === 'PROVIDER_TIMEOUT') {
            setLiveExecutionError(
              '⏱️ Yêu cầu khảo cứu trực tiếp vượt quá thời gian xử lý (timeout). Vui lòng thử lại với tài liệu ngắn gọn hơn.'
            );
          } else {
            setLiveExecutionError(
              data.error ||
                'Dịch vụ điều phối NotebookLM MCP hiện không khả dụng. Vui lòng thử lại sau.'
            );
          }
        } else {
          setLiveExecutionError(
            data.error ||
              'Có lỗi xảy ra trong quá trình khảo cứu trực tiếp qua NotebookLM.'
          );
        }
        return;
      }

      const now = new Date().toISOString();
      const liveArtifact: GroundedArtifactDTO = {
        id: data.artifactId,
        sessionId: data.sessionId,
        topicId: currentTopic.id,
        artifactType: mapLocalArtifactTypeToDTO(data.artifactType),
        title: data.title,
        rawContent: data.content,
        contentHash: `live-${data.artifactId}`,
        idempotencyKey: `direct-${data.artifactId}`,
        status: 'received',
        citationCount: data.citedSourceIds?.length || 0,
        sourcePackageVersion: currentSession.sourcePackages?.[0]?.version || 1,
        createdAt: now,
        updatedAt: now,
        metadata: {
          cleanupStatus: data.cleanupStatus,
          citedSourceIds: data.citedSourceIds,
          citations: data.citations,
          references: data.references,
          executionDurationMs: data.executionDurationMs,
        },
      };

      // Dedup and inject into session artifacts immediately using artifactId
      setSessionArtifacts((prev) => {
        const exists = prev.some((a) => a.id === liveArtifact.id);
        return exists
          ? prev.map((a) => (a.id === liveArtifact.id ? liveArtifact : a))
          : [liveArtifact, ...prev];
      });

      // Switch to results step immediately
      setActiveStep('results');

      // Secondary background reconciliation: sync session from DB without blocking direct render
      syncSession(currentTopic.id, true).catch((syncErr) => {
        console.warn(
          '[NotebookLMStudioModal] Background syncSession reconciliation failed:',
          syncErr
        );
      });
    } catch (err: unknown) {
      setLiveExecutionError(
        err instanceof Error
          ? err.message
          : 'Lỗi kết nối khi gửi yêu cầu khảo cứu trực tiếp.'
      );
    } finally {
      setIsLiveExecuting(false);
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
        setArtifactType(parsed.suggestedType || parsed.type);
        setSuggestedArtifactType(parsed.suggestedType || parsed.type);
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

    const contentHash = computeArtifactContentHash({
      topicId: currentTopic.id,
      type: artifactType,
      title: validation.sanitized!.title,
      content: validation.sanitized!.content,
    });
    const idempotencyKey = `local-art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Save to local storage as pending draft initially for offline safety
    const savedLocal = saveArtifact({
      topicId: currentTopic.id,
      type: artifactType,
      title: validation.sanitized!.title,
      content: validation.sanitized!.content,
      notebookUrl: validation.sanitized!.notebookUrl,
      source: 'antigravity-2.0',
      target: 'notebooklm',
      status: 'imported',
      syncStatus: 'pending',
      idempotencyKey,
      contentHash,
    });
    setLocalArtifacts(getStoredArtifacts());

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

    // Save to backend if session is active or can be ensured
    const session = await getOrEnsureSession(currentTopic.id);
    if (session) {
      try {
        const latestPackage = session.sourcePackages?.[0];
        const latestPrompt = session.taskPrompts?.[0];

        const res = await fetch('/api/artifacts/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            sourcePackageId: latestPackage?.id || null,
            taskPromptId: latestPrompt?.id || null,
            topicId: currentTopic.id,
            artifactType,
            title: validation.sanitized!.title,
            rawContent: validation.sanitized!.content,
            contentHash,
            idempotencyKey,
            metadata: {
              notebookUrl: validation.sanitized!.notebookUrl || null,
              source: 'antigravity-2.0',
              target: 'notebooklm',
            },
          }),
        });

        if (res.ok) {
          const { artifact } = await res.json();
          updateStoredArtifact(savedLocal.id, {
            id: artifact.id,
            syncStatus: 'synced',
          });
          setLocalArtifacts(getStoredArtifacts());
          setSessionArtifacts((prev) => [
            { ...artifact, sourcePackageVersion: latestPackage?.version || 1 },
            ...prev,
          ]);
        } else {
          updateStoredArtifact(savedLocal.id, { syncStatus: 'pending' });
          setLocalArtifacts(getStoredArtifacts());
          logStructuredEvent('warn', 'ARTIFACT_INGEST_FALLBACK', {
            reason: `Backend status ${res.status}`,
            artifactType,
            idempotencyKey,
          });
        }
      } catch (err) {
        console.error('Failed to ingest artifact to backend', err);
        updateStoredArtifact(savedLocal.id, { syncStatus: 'pending' });
        setLocalArtifacts(getStoredArtifacts());
        logStructuredEvent('warn', 'ARTIFACT_INGEST_FALLBACK', {
          reason: (err as Error)?.message || 'Network error',
          artifactType,
          idempotencyKey,
        });
      }
    }

    setShowAddArtifact(false);
    setSuggestedArtifactType(null);
    setArtifactTitle('');
    setArtifactContent('');
    setNotebookUrl('');
  };

  const handleRetryArtifactSync = async (artifact: NotebookLMArtifact) => {
    if (!currentTopic) return;
    const session = await getOrEnsureSession(currentTopic.id);
    if (!session) {
      setSyncWarning('Chưa thể đồng bộ artifact vì chưa có phiên nghiên cứu.');
      return;
    }
    try {
      const latestPackage = session.sourcePackages?.[0];
      const latestPrompt = session.taskPrompts?.[0];

      const res = await fetch('/api/artifacts/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          sourcePackageId: latestPackage?.id || null,
          taskPromptId: latestPrompt?.id || null,
          topicId: currentTopic.id,
          artifactType: artifact.type,
          title: artifact.title,
          rawContent: artifact.content,
          contentHash: artifact.contentHash,
          idempotencyKey: artifact.idempotencyKey,
          metadata: {
            notebookUrl: artifact.notebookUrl || null,
            source: artifact.source,
            target: artifact.target,
          },
        }),
      });

      if (res.ok) {
        const { artifact: serverArt } = await res.json();
        updateStoredArtifact(artifact.id, {
          id: serverArt.id,
          syncStatus: 'synced',
        });
        setLocalArtifacts(getStoredArtifacts());
        setSessionArtifacts((prev) => [
          { ...serverArt, sourcePackageVersion: latestPackage?.version || 1 },
          ...prev,
        ]);
        setSyncWarning(null);
      } else {
        updateStoredArtifact(artifact.id, { syncStatus: 'failed' });
        setLocalArtifacts(getStoredArtifacts());
        setSyncWarning('Retry đồng bộ artifact thất bại. Vui lòng thử lại.');
        logStructuredEvent('warn', 'ARTIFACT_INGEST_FALLBACK', {
          reason: `Retry failed with HTTP status ${res.status}`,
          artifactType: artifact.type,
          idempotencyKey: artifact.idempotencyKey,
        });
      }
    } catch (err: unknown) {
      console.error('Failed to retry artifact sync', err);
      updateStoredArtifact(artifact.id, { syncStatus: 'failed' });
      setLocalArtifacts(getStoredArtifacts());
      const msg =
        err instanceof Error && err.message
          ? `Retry đồng bộ thất bại: ${err.message}`
          : 'Retry đồng bộ artifact thất bại.';
      setSyncWarning(msg);
      logStructuredEvent('warn', 'ARTIFACT_INGEST_FALLBACK', {
        reason: (err as Error)?.message || 'Retry network error',
        artifactType: artifact.type,
        idempotencyKey: artifact.idempotencyKey,
      });
    }
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
          runtimeStatus={runtimeStatus}
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
          {syncWarning && (
            <div
              data-testid="sync-warning-banner"
              className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{syncWarning}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncWarning(null)}
                className="text-amber-700 dark:text-amber-300 hover:underline font-medium ml-2 px-1 py-0.5 rounded focus:outline-hidden"
              >
                Đóng
              </button>
            </div>
          )}

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
              excerpts={researchExcerpts}
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
              isLiveExecuting={isLiveExecuting}
              liveExecutionError={liveExecutionError}
              onExecuteLiveResearch={handleExecuteLiveResearch}
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
                setSuggestedArtifactType(null);
                setValidationError(null);
              }}
              suggestedArtifactType={suggestedArtifactType}
              onFileUpload={handleFileUpload}
              onDeleteLocalArtifact={handleDeleteLocalArtifact}
              onRetryArtifactSync={handleRetryArtifactSync}
              onReviewArtifact={(art) => setReviewingArtifact(art)}
              onSelectTopicId={setSelectedTopicId}
              allTopics={topics}
              onBackToPrompt={() => setActiveStep('prompt')}
              onLaunchStudySession={(tId) => {
                onClose();
                openFlashcardReview?.(tId);
              }}
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
        onNoteCreated={async () => {
          if (currentTopic) syncSession(currentTopic.id, true);
          await reloadAllData().catch(console.error);
        }}
        onFlashcardsCreated={(count) => {
          if (currentTopic) syncSession(currentTopic.id, true);
          reloadAllData().catch(console.error);
        }}
        onLaunchStudySession={(tId) => {
          onClose();
          openFlashcardReview?.(tId);
        }}
      />
    </div>
  );
}
