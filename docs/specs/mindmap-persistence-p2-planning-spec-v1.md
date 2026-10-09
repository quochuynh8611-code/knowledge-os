# Phase P2 Planning Spec — Interactive Canvas Editing & Node Mutation

Status: Draft for human approval only  
Phase: P2  
Track: Mind Map Persistence / Editing  
Depends on: `docs/specs/mindmap-persistence-p1-test-first-spec-v1.md`  
Implementation mode: Test-first, approval-gated  
Non-goal: This document does **not** authorize implementation.

## 1. Purpose

Phase P2 extends the completed persistence foundation from P1 into a controlled editing workflow for saved mind map documents. P2 introduces a mutable working copy on top of immutable saved versions so that users can change node titles, insert child nodes, delete nodes safely, and reorder sibling nodes before explicitly saving a new version.[cite:2][cite:3][cite:4]

The phase is intentionally constrained to client-side tree editing inside the existing Mind Map surface. It does not change server contracts, database schema, topic graph derivation rules, or the Local-First snapshot retention model introduced in P1.[cite:2][cite:3]

## 2. Current baseline

The current `MindMapView` already supports two viewing modes, `live-topic` and `saved-document`, and wires persistence operations such as create document, append version, rename, archive, and open saved snapshots.[cite:3] The current canvas component `MindMapTreeCanvas` supports focus, keyboard navigation, collapse/expand, topic selection, zoom, pan, cross-link rendering, and minimap behavior, but it does not yet expose mutation callbacks for editing the tree structure itself.[cite:4]

A direct design implication follows from this baseline: P2 must add an explicit editing layer without weakening the immutability guarantees of previously saved versions. Saved versions remain read-only snapshots; edits apply only to an in-memory working copy until the user chooses to save a new version.[cite:3][cite:4]

## 3. Problem statement

After P1, users can persist and reopen mind map documents, but they still cannot refine the saved document itself on canvas. The current workflow requires regenerating structure from the topic graph and re-saving, which prevents document-specific curation and blocks a true document lifecycle.[cite:2][cite:3]

Without P2, the system has no safe operator path for incremental authoring on a saved document. This also leaves a functional gap between “stored snapshot” and “editable knowledge artifact,” especially now that saved documents are treated as first-class entities.[cite:3]

## 4. Scope

### 4.1 In scope

P2 planning covers the following capabilities:

- Inline rename of a node title on the canvas.
- Add a child node under an existing node.
- Delete a node subject to safety rules.
- Reorder sibling nodes within the same parent.
- Dirty-state tracking for unsaved document edits.
- Explicit save-as-new-version workflow for edited saved documents.
- Guardrails when the user attempts to leave an edited working copy without saving.[cite:3][cite:4]

### 4.2 Out of scope

The following items are explicitly excluded from P2 base scope:

- Editing the live topic-derived graph directly.
- Server persistence, Prisma changes, or `src/server/*` changes.
- Changes to `DataContext` topic/note/resource source contracts.
- Arbitrary drag-and-drop reparenting across the entire tree.
- Cross-link editing.
- Collaborative editing, multi-tab reconciliation, or CRDT logic.
- Rich text node content, markdown body editing, attachments, or comments.[cite:2][cite:4]

## 5. Design principles

### 5.1 Immutable snapshots, mutable working copy

Every persisted `MindMapVersion` remains immutable after it has been saved. P2 introduces a transient working tree used only during the current editing session; the tree becomes durable only when the operator saves a new version.[cite:3]

### 5.2 Read-before-write discipline

Editing logic must be isolated behind pure tree mutation functions before any UI event wiring is written. This keeps behavior testable and prevents canvas event code from becoming the hidden source of truth.

### 5.3 Narrow blast radius

The expected high-risk files are `MindMapView.tsx` and `MindMapTreeCanvas.tsx`. Existing protected boundaries such as `DataContext`, `mindmapProjection`, `schema.prisma`, `src/server/*`, `package.json`, and `vite.config.ts` remain unchanged in the base P2 plan.[cite:2]

### 5.4 Saved-document first

P2 editing applies first to `saved-document` mode only. `live-topic` mode remains projection-oriented and non-destructive, which reduces ambiguity about whether the user is editing the source topic graph or a saved document projection.[cite:3]

## 6. Proposed architecture

### 6.1 New editing model

P2 introduces a working state layer in `MindMapView`:

- `workingDocumentTree: MindMapTreeNode | null`
- `isDirty: boolean`
- `editingNodeId: string | null`
- `pendingDestructiveAction: { type: 'delete-node'; nodeId: string } | null`

This working state exists only when `activeMode === 'saved-document'`. In `live-topic` mode, the current behavior remains projection-only and no editable working copy is created.[cite:3]

### 6.2 Module decomposition

The current tree adapters are imported from `mindmapDocumentStorage.ts`, which couples storage concerns with tree transformation concerns.[cite:2][cite:3] Before or during P2, the adapter layer should be extracted to a dedicated module:

- `src/lib/mindmapTreeAdapter.ts` — projection/document conversion only.
- `src/lib/mindmapTreeMutations.ts` — pure immutable tree operations.
- `src/lib/mindmapDocumentStorage.ts` — repository operations only.

This refactor is recommended because tree mutation complexity will grow quickly once insert/delete/reorder flows are added.

### 6.3 Mutation API contract

The new pure mutation layer should expose functions similar to:

```ts
renameNodeTitle(tree, nodeId, nextTitle)
insertChildNode(tree, parentNodeId, input)
deleteNode(tree, nodeId)
moveNodeWithinParent(tree, nodeId, direction)
findNodeById(tree, nodeId)
validateMindMapTree(tree)
```

Each operation returns a structured result rather than throwing by default:

```ts
{
  ok: boolean;
  tree?: MindMapTreeNode;
  error?: {
    code: string;
    message: string;
  };
}
```

The contract mirrors the safety orientation used by P1 storage operations and allows the UI to surface validation failures predictably.

## 7. Domain rules and invariants

The following invariants must be treated as hard rules during P2:

1. Root node cannot be deleted.
2. Node IDs must remain unique after every mutation.
3. Mutation functions must be immutable; the input tree must not be mutated in place.
4. Reorder in P2 is limited to siblings under the same parent.
5. Deleting a node deletes its entire subtree unless a narrower rule is later approved.
6. Blank titles are invalid after trimming.
7. Saved versions remain unchanged until `appendMindMapVersion()` is explicitly called.[cite:3][cite:4]

Additional recommended constraints for predictable UX:

8. Newly created child nodes receive a deterministic default title such as `Nút mới` or `New Node` until edited.
9. New nodes should be inserted at the end of the parent’s child list unless another placement rule is explicitly approved.
10. Reorder commands that would move beyond the first or last sibling should no-op safely.

## 8. Interaction model

### 8.1 Mode semantics

- `live-topic`: read-only projection from topic graph, no mutable working copy.
- `saved-document`: editable working copy layered above the active saved version.[cite:3]

When a saved document is opened, the system loads the persisted version as the baseline and derives `workingDocumentTree` from it. Further edits affect only `workingDocumentTree` until save.

### 8.2 Inline rename

The operator can enter title edit mode from the selected/focused node. Editing remains local until commit. Commit triggers validation; invalid blank values keep the edit field open and surface a user-visible validation message.

Suggested commit/cancel behavior:

- Enter or blur commits when valid.
- Escape cancels and restores the previous title.
- Empty or whitespace-only input is rejected.

### 8.3 Add child node

The operator adds a child from the focused node. The system creates a new node in the working tree and immediately enters title-edit mode for that new node.

This keeps the edit flow compact and avoids leaving anonymous nodes stranded in the tree.

### 8.4 Delete node

Node deletion is destructive because it removes an entire subtree. P2 should therefore require an explicit confirmation step for non-trivial deletes, especially when the target node has children.

Recommended rule:

- Leaf node delete: inline confirm or compact modal acceptable.
- Branch delete: explicit confirmation required and subtree impact stated.
- Root delete: blocked entirely.

### 8.5 Reorder siblings

P2 base scope should implement reorder as bounded sibling movement rather than free drag-and-drop. This can be exposed via toolbar actions, contextual controls, or keyboard shortcuts and yields much lower complexity than arbitrary pointer-driven tree surgery.[cite:4]

Free-form drag-and-drop may be reconsidered in a later sub-phase only after immutable movement semantics and dirty-state guardrails are stable.

### 8.6 Unsaved changes warning

If `isDirty === true`, the user must receive a confirmation guard before:

- returning from `saved-document` to `live-topic`,
- opening another saved document,
- closing the editing modal if a modal-based editor is later added,
- reloading the current saved-document session through a destructive reset path.

## 9. State machine

P2 should treat editing as a small explicit state machine rather than a loose collection of flags.

### 9.1 States

- `viewing-saved-document`
- `editing-node-title`
- `dirty-working-copy`
- `confirming-destructive-action`
- `saving-new-version`
- `save-complete`

### 9.2 Events

- `OPEN_DOCUMENT`
- `START_RENAME`
- `COMMIT_RENAME`
- `CANCEL_RENAME`
- `ADD_CHILD`
- `REQUEST_DELETE_NODE`
- `CONFIRM_DELETE_NODE`
- `MOVE_NODE_UP`
- `MOVE_NODE_DOWN`
- `SAVE_VERSION`
- `DISCARD_CHANGES`
- `LEAVE_DOCUMENT`

### 9.3 Transitions

Core transition expectations:

- Any successful structural or title mutation sets `isDirty = true`.
- `SAVE_VERSION` only succeeds when the working tree passes validation.
- Successful save clears `isDirty` and replaces the baseline version with the newly saved one.
- `DISCARD_CHANGES` resets the working tree to the latest persisted version.

## 10. UX acceptance rules

P2 should remain operationally simple. The following UX rules keep the feature understandable:

- The UI must always show whether the user is in `live-topic` or `saved-document` mode.[cite:3]
- A visible “unsaved changes” signal must appear when `isDirty === true`.
- Save action copy must indicate that a **new version** will be created, not overwrite history.
- Editing affordances should appear only when the current mode supports editing.
- Error messages should be localized consistently with the existing Mind Map UI language.

## 11. File boundary plan

### 11.1 Planned new files

1. `src/lib/mindmapTreeAdapter.ts`
2. `src/lib/mindmapTreeMutations.ts`
3. `tests/unit/mindmap-tree-mutations.test.ts`
4. `docs/specs/mindmap-persistence-p2-planning-spec-v1.md`

### 11.2 Planned modified files

1. `src/components/mindmap/MindMapView.tsx`
2. `src/components/mindmap/MindMapTreeCanvas.tsx`
3. `tests/unit/mindmap-persistence-ui.test.tsx`
4. `tests/unit/mindmap-document-storage.test.ts` only if adapter extraction requires updated import boundaries

### 11.3 Protected files

No changes planned for:

- `src/context/DataContext.tsx`
- `src/lib/mindmapProjection.ts`
- `src/components/mindmap/MindMapCrossLinksLayer.tsx` unless strictly required for render compatibility
- `prisma/schema.prisma`
- `src/server/*`
- `package.json`
- `vite.config.ts`[cite:2]

## 12. Test-first plan

### 12.1 Pure mutation tests

A dedicated mutation test file should be written first. Minimum scenario set:

1. Rename node title successfully.
2. Reject blank renamed title.
3. Add child under valid parent.
4. Reject add-child for nonexistent parent.
5. Delete leaf node successfully.
6. Delete branch node and remove subtree.
7. Reject root deletion.
8. Move sibling up within bounds.
9. Move sibling down within bounds.
10. No-op safely when moving first sibling up or last sibling down.
11. Preserve immutability of input tree for every operation.
12. Preserve uniqueness of all node IDs after insertion.

### 12.2 UI integration tests

UI tests should then prove the operator workflow end-to-end:

1. Open saved document and display editing controls.
2. Rename node inline and mark document dirty.
3. Add child node and focus the new title editor.
4. Delete node with confirmation.
5. Reorder node among siblings.
6. Save dirty working copy as a new version.
7. Attempt to leave document with dirty changes and receive warning.
8. Discard changes and restore the previous persisted tree.

### 12.3 Gherkin scenarios

#### Scenario: rename node title

```gherkin
Given a saved mind map document is open in saved-document mode
And the working copy contains a node titled "Aspirin"
When the operator renames the node title to "Acetylsalicylic Acid"
Then the working copy should reflect the new title
And the persisted saved version should remain unchanged
And the document should be marked as having unsaved changes
```

#### Scenario: reject blank title

```gherkin
Given a saved mind map document is open in saved-document mode
And the operator starts editing an existing node title
When the operator commits an empty or whitespace-only title
Then the mutation should be rejected
And the original title should remain visible
And the document should not create a new saved version
```

#### Scenario: add child node

```gherkin
Given a saved mind map document is open in saved-document mode
And a node is focused on the canvas
When the operator adds a child node
Then a new child node should be appended under the focused node
And the new node should receive a unique identifier
And the new node should enter title edit mode
And the document should be marked as having unsaved changes
```

#### Scenario: delete branch safely

```gherkin
Given a saved mind map document is open in saved-document mode
And the selected node has child nodes
When the operator requests deletion of the selected node
Then the system should ask for explicit confirmation
When the operator confirms deletion
Then the selected node and its subtree should be removed from the working copy
And the persisted saved version should remain unchanged
And the document should be marked as having unsaved changes
```

#### Scenario: prevent root deletion

```gherkin
Given a saved mind map document is open in saved-document mode
And the root node is selected
When the operator requests deletion
Then the deletion should be blocked
And the system should explain that the root node cannot be removed
```

#### Scenario: reorder siblings

```gherkin
Given a saved mind map document is open in saved-document mode
And a node has at least one sibling under the same parent
When the operator moves the node upward
Then the node order within that parent should be updated immutably
And no other branch outside that parent should be modified
And the document should be marked as having unsaved changes
```

#### Scenario: warn before leaving dirty document

```gherkin
Given a saved mind map document is open in saved-document mode
And the working copy contains unsaved changes
When the operator attempts to return to live-topic mode
Then the system should display a confirmation warning
And the operator should be able to cancel leaving
Or discard changes and continue
```

#### Scenario: save new version from edited working copy

```gherkin
Given a saved mind map document is open in saved-document mode
And the working copy contains valid unsaved changes
When the operator saves the document
Then a new immutable version should be appended to that document
And the current version number should increase sequentially
And the working copy should no longer be marked dirty
```

## 13. Risks and mitigations

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Adapter remains inside storage module | Storage and tree semantics continue to grow together | Extract adapter before or at start of P2 |
| Inline edit state leaks into canvas complexity | Canvas already handles navigation, pan, zoom, hover, focus | Keep mutation semantics in pure functions and keep canvas mostly declarative |
| Unsaved edits are lost on mode switch | P2 introduces mutable working copy | Add leave guards before any mode/document switch |
| Drag-and-drop complexity expands blast radius | Arbitrary reparenting requires richer hit-testing and invalid move rules | Limit P2 base to sibling reorder only |
| Version semantics become ambiguous | Users may assume save overwrites current snapshot | Label save action as “create new version” and test sequential version behavior |

## 14. Implementation roadmap checklist

This checklist is the approval gate reference. It is not an instruction to start coding yet.

### Step A — boundary cleanup

- [ ] Confirm and approve adapter extraction into `mindmapTreeAdapter.ts`
- [ ] Freeze storage API shape before UI editing work

### Step B — pure logic first

- [ ] Define `mindmapTreeMutations.ts` function contracts
- [ ] Write failing unit tests for all mutation invariants
- [ ] Implement pure immutable mutations only after tests exist

### Step C — working-copy orchestration

- [ ] Add `workingDocumentTree` and `isDirty` orchestration to `MindMapView`
- [ ] Ensure saved version baseline remains immutable
- [ ] Add discard/reset behavior

### Step D — canvas editing affordances

- [ ] Add inline rename UX
- [ ] Add child insertion affordance
- [ ] Add guarded deletion affordance
- [ ] Add bounded sibling reorder controls

### Step E — versioning and leave guards

- [ ] Save edited working copy as new immutable version
- [ ] Add unsaved-changes warning before mode/document exit
- [ ] Verify version number increments sequentially

### Step F — verification

- [ ] All new mutation tests pass
- [ ] All updated UI tests pass
- [ ] Existing P1 persistence tests remain green
- [ ] Manual smoke test covers rename/add/delete/reorder/save/discard flows

## 15. Approval gate

No implementation should begin until the following questions are answered explicitly:

1. Should P2 base scope support editing only for `saved-document`, or also allow “save draft from live-topic then edit immediately” as a guided entry path?
2. What is the default language for new node titles in the current product context?
3. Is bounded sibling reorder sufficient for P2, or is drag-and-drop already considered mandatory?
4. Should branch deletion require a full confirmation modal in all cases, or only when the target has descendants?
5. Should dirty-state warning prefer a browser-native confirm or a product-styled modal?

## 16. Exit criteria

P2 planning is considered complete when:

- Scope and non-scope are approved.
- Mutation invariants are approved.
- File boundaries are approved.
- Gherkin scenarios are approved.
- Implementation roadmap is approved.
- Human approval is given to proceed into failing tests and implementation planning.
