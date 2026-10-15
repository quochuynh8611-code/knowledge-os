import { ActiveTab } from "../../context/DataContext";

export type TabContainerPolicy = "full" | "wide" | "constrained" | "reading";

/**
 * Determines the layout container policy for a given active tab and optional sub-view.
 * - 'full': Canvas-based or specialized dual-pane split views (Knowledge Graph, Mind Map, Library).
 * - 'wide': Data-intensive multi-column workspaces (Dashboard, Notes, Resources, Progress, Search, AI Studio).
 * - 'constrained': Content-focused reading, card quizzes or linear forms (Topics, Flashcards review).
 */
export function getTabContainerPolicy(
  activeTab: ActiveTab,
  subView?: string | null
): TabContainerPolicy {
  switch (activeTab) {
    case "graph":
    case "mindmap":
    case "library":
      return "full";

    case "dashboard":
    case "notes":
    case "resources":
    case "progress":
    case "search":
    case "ai_studio":
      return "wide";

    case "topics":
    case "flashcards":
      return "constrained";

    default:
      return "wide";
  }
}

/**
 * Returns Tailwind CSS class names corresponding to the tab container policy.
 */
export function getTabContainerClass(
  activeTab: ActiveTab,
  subView?: string | null
): string {
  const policy = getTabContainerPolicy(activeTab, subView);

  switch (policy) {
    case "full":
      return "w-full h-full min-w-0 max-w-none";

    case "wide":
      return "w-full max-w-[1600px] 2xl:max-w-[1850px] mx-auto min-w-0 px-2 sm:px-4 lg:px-6";

    case "constrained":
      return "w-full max-w-5xl 2xl:max-w-6xl mx-auto min-w-0 px-2 sm:px-4";

    case "reading":
      return "w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-6";
  }
}
