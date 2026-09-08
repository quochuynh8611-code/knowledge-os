/**
 * Utility functions for Obsidian Document Viewer Deep Linking and Reading Position persistence.
 */

export function getStorageKey(noteId: string): string {
  return `obsidian-viewer:${noteId}:activeHeading`;
}

export function saveReadingPosition(noteId: string, headingId: string): void {
  if (!noteId || !headingId) return;
  try {
    localStorage.setItem(getStorageKey(noteId), headingId);
  } catch (error) {
    console.warn('Failed to save reading position:', error);
  }
}

export function restoreReadingPosition(noteId: string): string | null {
  if (!noteId) return null;
  try {
    return localStorage.getItem(getStorageKey(noteId));
  } catch (error) {
    console.warn('Failed to restore reading position:', error);
    return null;
  }
}

export function getHeadingFromQueryParam(): string | null {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('heading');
  } catch {
    return null;
  }
}

export function updateHeadingQueryParam(headingId: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (headingId) {
      url.searchParams.set('heading', headingId);
    } else {
      url.searchParams.delete('heading');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Graceful fallback in non-browser or sandboxed environments
  }
}
