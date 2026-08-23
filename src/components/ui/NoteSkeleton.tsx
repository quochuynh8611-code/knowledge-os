import React from "react";
import { LoadingSkeleton } from "./LoadingSkeleton";

export interface NoteSkeletonProps {
  count?: number;
  className?: string;
}

export function NoteSkeleton({ count = 4, className = "" }: NoteSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <LoadingSkeleton variant="rect" width="80px" height="20px" />
            <LoadingSkeleton variant="text" width="70px" height="12px" />
          </div>
          <LoadingSkeleton variant="text" width="65%" height="18px" />
          <LoadingSkeleton variant="text" count={3} />
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
            <LoadingSkeleton variant="text" width="110px" height="14px" />
            <div className="flex gap-1.5">
              <LoadingSkeleton variant="circle" width="24px" height="24px" />
              <LoadingSkeleton variant="circle" width="24px" height="24px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
