# ADR-068: Obsidian Vault Selector UX Polish Enhancements (P4.3D)

- **Status**: Accepted
- **Date**: 2026-09-05
- **Context**: Phase P4.3D — Obsidian Vault Selector UX Polish (Branch `neh1`)
- **Deciders**: Technical Architect, Senior Frontend Engineer

---

## 1. Context and Problem Statement

Following the completion of P4.3B (Backend Vault Profile Manager) and P4.3C (Frontend Vault Selector Dropdown), user feedback and product requirements highlight four key areas of UX refinement:
1. **Toast Notifications**: Replace or augment inline status/error text with clear, accessible, self-dismissing toasts for successful switches and descriptive failure feedback.
2. **Keyboard Accessibility & Shortcuts**: Provide fluid keyboard navigation for power users:
   - Dedicated shortcut (`Alt + V` / `Option + V`) to quickly focus the Vault Selector.
   - Standard dropdown navigation (`ArrowUp`, `ArrowDown`, `Enter`) and dismiss (`Escape`).
3. **Recent Vaults Persistence**: Keep track of the user's most frequently/recently used vaults (up to 3) in `localStorage`, prioritising them in the dropdown without disrupting the full list.
4. **Vault Icon Mapping**: Enhance visual identification with context-appropriate emojis/icons based on `vaultId` keywords (defaulting to 📁).

---

## 2. Decision Drivers

- **Zero Breaking Changes**: Must strictly preserve the existing API contract (`GET /api/obsidian/vaults`, `POST /api/obsidian/vault/switch`, `GET /api/obsidian/vault/status`) and modal component tree.
- **React 19 Compatibility & Zero Dependencies**: Avoid external toast dependencies that may conflict with React 19 peer dependencies or bloat bundle size.
- **WCAG 2.1 AA Accessibility**: Proper ARIA live regions (`role="status"`, `role="alert"`), keyboard trapping avoidance, clear focus indicators.
- **Defensive Resilience**: Safe handling of `localStorage` (private browsing, incognito, disabled storage, corrupt JSON).

---

## 3. Considered Options

### 3.1. Toast Notification System
- **Option A**: Install `sonner` or `react-hot-toast`.
  - *Cons*: Potential React 19 peer dependency conflicts, external runtime weight for a single feature.
- **Option B (Selected)**: Lightweight, accessible internal `Toast` component and hook (`src/components/ui/Toast.tsx` / `useToast`).
  - *Pros*: Zero external dependencies, 100% React 19 compatible, uses existing Tailwind CSS tokens, accessible via `role="status"` and `aria-live="polite"`.

### 3.2. Keyboard Shortcut Scheme
- **Option A**: Global `Cmd/Ctrl + K`.
  - *Cons*: Directly clashes with the global application Command Palette (`useKeyboardShortcuts.ts`).
- **Option B (Selected)**: `Alt + V` / `Option + V` (dedicated vault shortcut) + `Escape` to close + `ArrowDown`/`ArrowUp` to navigate items.
  - *Pros*: Completely eliminates collisions with existing Command Palette (`Cmd+K`) and Modal Escape handlers.

### 3.3. Recent Vaults Storage Schema
- **Key**: `obsidian_recent_vaults` in `localStorage`.
- **Data Structure**: `string[]` storing up to 3 `vaultId` strings.
- **Behavior**:
  - On switch success: insert `vaultId` at index 0, deduplicate, truncate to `slice(0, 3)`.
  - On retrieval: parse JSON safely, validate as array of strings, filter out unknown/deleted vaults against active vault list.
  - Fallback: returns `[]` on error or empty.

### 3.4. Vault Icon Mapping Strategy
- **Function**: `getVaultIcon(vaultId: string, label?: string): string` in `src/lib/vault-icons.ts`.
- **Mapping rules**:
  - `research` / `study` / `learn` -> 🔬 or 📚
  - `journal` / `daily` / `diary` -> 📓
  - `phat-hoc` / `buddhism` / `zen` -> 🪷
  - `business` / `work` / `sop` -> 💼
  - `tech` / `code` / `dev` -> 💻
  - Default fallback -> 📁

---

## 4. Consequences

### Positive
- Rich visual feedback without screen-space clutter.
- Power users can switch vaults without touching the mouse.
- Instant access to recent vaults reduces repetitive scrolling.
- Self-contained, modular implementation with 100% unit test coverage.

### Negative / Trade-offs
- Internal Toast component is localized; if the broader app adopts a global toast provider later, this can easily be swapped or extracted.

---

## 5. Compliance & Verification
- Unit tests:
  - `tests/unit/vault-icons.test.ts`
  - `tests/unit/vault-preference.test.ts`
  - `tests/unit/vault-keyboard-shortcut.test.ts`
  - `tests/unit/obsidian-vault-selector.test.tsx` (updated for UX enhancements)
- Full regression verification via `npm run test`.
