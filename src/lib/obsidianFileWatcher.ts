import chokidar, { FSWatcher } from "chokidar";
import fs from "fs";

export interface ObsidianFileChangeEvent {
  type: "file-changed";
  filePath: string;
  mtime: string;
}

interface WatchedTarget {
  watcher: FSWatcher;
  listeners: Set<(event: ObsidianFileChangeEvent) => void>;
  debounceTimer?: NodeJS.Timeout;
}

/**
 * High-performance, debounced file watcher for Obsidian Vault documents.
 * Employs chokidar for reliable atomic save detection and zero-overhead listener cleanup.
 */
export class ObsidianFileWatcher {
  private watchedTargets = new Map<string, WatchedTarget>();
  private debounceMs: number;

  constructor(debounceMs = 500) {
    this.debounceMs = debounceMs;
  }

  watch(
    realPath: string,
    relativePath: string,
    listener: (event: ObsidianFileChangeEvent) => void
  ): () => void {
    let target = this.watchedTargets.get(realPath);

    if (!target) {
      const fsWatcher = chokidar.watch(realPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      target = {
        watcher: fsWatcher,
        listeners: new Set(),
      };
      this.watchedTargets.set(realPath, target);

      const emitChange = () => {
        const currentTarget = this.watchedTargets.get(realPath);
        if (!currentTarget) return;

        if (currentTarget.debounceTimer) {
          clearTimeout(currentTarget.debounceTimer);
        }

        currentTarget.debounceTimer = setTimeout(() => {
          let mtime = new Date().toISOString();
          try {
            if (fs.existsSync(realPath)) {
              mtime = fs.statSync(realPath).mtime.toISOString();
            }
          } catch {
            // Keep current timestamp if stat fails temporarily
          }

          const event: ObsidianFileChangeEvent = {
            type: "file-changed",
            filePath: relativePath,
            mtime,
          };

          for (const l of currentTarget.listeners) {
            try {
              l(event);
            } catch {
              // Ignore single listener failures
            }
          }
        }, this.debounceMs);
      };

      fsWatcher.on("change", emitChange);
      fsWatcher.on("add", emitChange);
    }

    target.listeners.add(listener);

    return () => {
      this.unwatch(realPath, listener);
    };
  }

  unwatch(realPath: string, listener: (event: ObsidianFileChangeEvent) => void): void {
    const target = this.watchedTargets.get(realPath);
    if (!target) return;

    target.listeners.delete(listener);

    if (target.listeners.size === 0) {
      if (target.debounceTimer) {
        clearTimeout(target.debounceTimer);
      }
      target.watcher.close().catch(() => {});
      this.watchedTargets.delete(realPath);
    }
  }

  async closeAll(): Promise<void> {
    for (const [, target] of this.watchedTargets) {
      if (target.debounceTimer) {
        clearTimeout(target.debounceTimer);
      }
      await target.watcher.close().catch(() => {});
    }
    this.watchedTargets.clear();
  }
}
