#!/bin/bash
# TER PWA: build + publish to a SEPARATE deployment repo (dist only, no source).
# Usage:
#   bash scripts/pwa-deploy.sh /path/to/ter-pwa-repo
#   (optionally prefix EXPO_PUBLIC_API_URL=https://ter.finfect.biz/ for a live-URL build)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:?Usage: pwa-deploy.sh <absolute-path-to-deployment-repo>}"

# 1. Build the PWA (export + patch index.html)
bash "$SCRIPT_DIR/pwa-export.sh"

# 2. Sync ONLY the built site into the deployment repo
rsync -a --delete "$SCRIPT_DIR/../dist/" "$TARGET/"

# 3. Commit + push from the deployment repo
cd "$TARGET"
git add -A
git commit -m "PWA update $(date '+%Y-%m-%d %H:%M')" || echo "Nothing to commit"
git push
echo "Deployed. Site live at your Pages URL."
