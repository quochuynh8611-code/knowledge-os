import React, { useEffect, useState, useRef } from "react";
import { AlertCircle, FileCode } from "lucide-react";

export interface MermaidDiagramBlockProps {
  code: string;
  className?: string;
}

export function MermaidDiagramBlock({ code, className = "" }: MermaidDiagramBlockProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const cleanCode = code.trim();

    if (!cleanCode) {
      setSvgHtml(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      // Detect dark theme from document.documentElement
      const isDark = document.documentElement.classList.contains("dark");

      try {
        const mermaidModule = await import("mermaid");
        const mermaid = (mermaidModule.default || mermaidModule) as any;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "strict",
          fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 10)}`;

        const { svg } = await mermaid.render(uniqueId, cleanCode);

        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Lỗi cú pháp biểu đồ Mermaid");
          setSvgHtml(null);
          setIsLoading(false);
        }
        // Cleanup potential rogue mermaid container inserted into body
        const rogueDiv = document.querySelector(`[id^="dmermaid-"]`) || document.querySelector(`[id^="mermaid-"]`);
        if (rogueDiv && rogueDiv.parentElement === document.body) {
          rogueDiv.remove();
        }
      }
    };

    renderDiagram();

    // Listen to theme change via MutationObserver
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          renderDiagram();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [code]);

  if (error) {
    return (
      <div
        data-testid="mermaid-error-fallback"
        className={`p-3.5 my-4 rounded-2xl bg-amber-50/80 dark:bg-stone-900 border border-amber-300 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 space-y-2 shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
          <span>Biểu đồ Mermaid không thể hiển thị</span>
        </div>
        <p className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">{error}</p>
        <pre className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-950 font-mono text-[11px] overflow-x-auto border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (isLoading && !svgHtml) {
    return (
      <div
        data-testid="mermaid-diagram-block"
        className={`mermaid-diagram-block p-6 my-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 flex items-center justify-center gap-2 text-xs text-stone-400 dark:text-stone-500 animate-pulse ${className}`}
      >
        <FileCode className="w-4 h-4 animate-spin text-amber-600/60" />
        <span>Đang dựng sơ đồ Mermaid...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="mermaid-diagram-block"
      data-subtestid="mermaid-diagram-container"
      className={`mermaid-diagram mermaid-diagram-block my-5 p-4 rounded-2xl bg-white dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 shadow-2xs overflow-x-auto flex justify-center text-center ${className}`}
      dangerouslySetInnerHTML={{ __html: svgHtml || "" }}
    />
  );
}
