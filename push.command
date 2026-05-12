#!/bin/bash
cd "$(dirname "$0")"
echo "🔧 Clearing git locks..."
rm -f .git/index.lock .git/HEAD.lock
echo "📦 Staging changes..."
git add PHC_Task_Manager_v4.html PHC_AppsScript.gs
echo "💾 Committing..."
git commit -m "fix: click-to-edit, board/schedule drag, doc persistence"
echo "🚀 Pushing to GitHub..."
git push
echo ""
echo "✅ Done! GitHub Pages will update in ~30 seconds."
echo "Press any key to close..."
read -n 1
