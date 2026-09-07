export type ShortcutScopeType = "global" | "flashcard_review" | string;

class ShortcutScopeManager {
  private scopeStack: ShortcutScopeType[] = [];

  pushScope(scope: ShortcutScopeType): () => void {
    this.scopeStack.push(scope);
    return () => this.popScope(scope);
  }

  popScope(scope: ShortcutScopeType): void {
    const idx = this.scopeStack.lastIndexOf(scope);
    if (idx !== -1) {
      this.scopeStack.splice(idx, 1);
    }
  }

  getCurrentScope(): ShortcutScopeType {
    return this.scopeStack[this.scopeStack.length - 1] || "global";
  }

  isScopeActive(scope: ShortcutScopeType): boolean {
    return this.getCurrentScope() === scope;
  }

  reset(): void {
    this.scopeStack = [];
  }
}

export const shortcutScope = new ShortcutScopeManager();
