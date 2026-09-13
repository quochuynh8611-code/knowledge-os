import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  Copy,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { AdvancedTechnicalDetailsProps } from './types';
import { buildAntigravityCLICommand, AntigravityJobStatus } from '../../../lib/antigravityPipeline';
import { getHumanReadableJobStatus } from './utils';

export function AdvancedTechnicalDetails({
  isOpen,
  onToggleOpen,
  activeJob,
  handoffJobs,
  currentSession,
  copiedCliCommand,
  onCopyCliCommand,
  onDeleteJob,
}: AdvancedTechnicalDetailsProps) {
  const targetJob = activeJob || handoffJobs[0];
  const hasJobs = Boolean(targetJob || handoffJobs.length > 0);

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-white dark:bg-stone-900 transition shadow-2xs">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-controls="notebooklm-advanced-technical-panel"
        className="w-full px-4 py-3 bg-stone-100/70 dark:bg-stone-950/80 hover:bg-stone-200/60 dark:hover:bg-stone-900 text-left flex items-center justify-between transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
            Chi tiết kỹ thuật nâng cao &bull; Antigravity 2.0 CLI &amp; Job Tracker
          </span>
          {handoffJobs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
              {handoffJobs.length} job(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isOpen ? 'Thu gọn' : 'Mở rộng'}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div
          id="notebooklm-advanced-technical-panel"
          className="p-4 bg-stone-900 dark:bg-black/90 text-stone-100 space-y-4 border-t border-stone-800 text-xs"
        >
          {/* 1. Headless CLI Command */}
          {hasJobs ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Terminal className="w-4 h-4" />
                  <span>Lệnh Antigravity CLI Headless (agy -p):</span>
                </div>
                <button
                  type="button"
                  data-testid="btn-copy-handoff-cli"
                  onClick={() => onCopyCliCommand(targetJob)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedCliCommand ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Đã sao chép lệnh CLI</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép lệnh CLI</span>
                    </>
                  )}
                </button>
              </div>

              <div
                data-testid="handoff-cli-command-preview"
                className="p-3 bg-stone-950 rounded-lg font-mono text-[11px] text-amber-200 break-all border border-stone-800 selection:bg-amber-900 selection:text-white"
              >
                {buildAntigravityCLICommand(targetJob)}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-stone-400 italic">
              Chưa có lệnh CLI nào được sinh. Hãy nhấn "Chuẩn bị Handoff Antigravity" ở Bước 2 để tạo lệnh headless.
            </p>
          )}

          {/* 2. Pipeline History & Job Tracker */}
          {handoffJobs.length > 0 && (
            <div
              data-testid="handoff-jobs-tracker-list"
              className="pt-2 border-t border-stone-800 space-y-2"
            >
              <div className="text-[11px] font-semibold text-stone-400">
                Lịch sử Pipeline Handoff ({handoffJobs.length}):
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {handoffJobs.map((job) => {
                  const statusInfo = getHumanReadableJobStatus(job.status);
                  return (
                    <div
                      key={job.jobId}
                      data-testid="handoff-job-item"
                      className="flex items-center justify-between p-2 bg-stone-800/80 rounded-lg text-[11px] text-stone-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-stone-400">{job.jobId}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${statusInfo.badgeClass}`}
                          title={statusInfo.description}
                        >
                          {job.status}
                        </span>
                        <span className="text-stone-400">({job.artifactType})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid="btn-delete-handoff-job"
                          onClick={() => onDeleteJob(job.jobId)}
                          className="text-stone-500 hover:text-rose-400 p-1 transition cursor-pointer"
                          title="Xóa job"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Session Diagnostics Metadata */}
          {currentSession && (
            <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 font-mono">
              <span>Session ID: {currentSession.id}</span>
              <span>Trạng thái: {currentSession.status}</span>
              <span>
                Packages: {currentSession.sourcePackages?.length || 0} &bull; Prompts:{' '}
                {currentSession.taskPrompts?.length || 0}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
