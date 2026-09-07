#!/bin/bash
set -e

echo "📝 Creating GitHub Release v0.10.0..."

gh release create v0.10.0 \
  --title "Phase F6.10: Note-to-Flashcard Integration" \
  --notes-file .github/RELEASE_NOTES_F6.10.md

echo "✅ GitHub Release created successfully!"
echo "🔗 View release: https://github.com/$(gh repo view --json url -q .url)/releases/tag/v0.10.0"
