#!/bin/bash
set -e

echo "🧪 Running unit/integration tests..."
npm test -- tests/unit/note-cloze-detection.test.ts \
          tests/unit/flashcard-form-modal.test.tsx \
          tests/unit/note-batch-card-parser.test.ts \
          tests/integration/note-batch-card-creation.test.tsx \
          tests/unit/note-text-selection-popover.test.tsx \
          tests/integration/note-selection-to-modal.test.tsx \
          tests/unit/note-card-list-section.test.tsx

echo "🎭 Running E2E tests..."
npx playwright test tests/e2e/f6.10-note-to-flashcard.spec.ts

echo "🔍 Type check..."
npx tsc --noEmit

echo "🏗️  Building production..."
npm run build

echo "📦 Committing changes..."
git add -A
git commit -m "feat(f6.10): Note-to-Flashcard Integration (US1–US4, ADR, tests, user guide, E2E)"

echo "🏷️  Creating git tag..."
git tag -a v0.10.0 -m "Phase F6.10: Note-to-Flashcard Integration"

CURRENT_BRANCH=$(git branch --show-current)
echo "🚀 Pushing to GitHub (${CURRENT_BRANCH})..."
git push origin "${CURRENT_BRANCH}"
git push origin v0.10.0

echo "✅ Release F6.10 complete!"
echo ""
echo "📝 Next step: Create GitHub Release manually or with:"
echo "   gh release create v0.10.0 --title 'Phase F6.10: Note-to-Flashcard Integration' --notes-file .github/RELEASE_NOTES_F6.10.md"
