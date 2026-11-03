#!/bin/bash
# TER PWA export: bundles web build + injects PWA tags into index.html
# Usage: scripts/pwa-export.sh            -> UAT API (default)
#        EXPO_PUBLIC_API_URL=https://ter.finfect.biz/ scripts/pwa-export.sh   -> live API
set -e
cd "$(dirname "$0")/.."
rm -rf dist
npx expo export --platform web
mkdir -p dist/data
cp INDOFIL_LimitMaster_Import_Sample.xlsx INDOFIL_Limits_Confirmed_Import.xlsx dist/data/
python3 - <<'PY'
p = 'dist/index.html'
html = open(p).read()
head_add = '''    <link rel="manifest" href="manifest.json" />
    <meta name="theme-color" content="#186E93" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="TER" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />'''
html = html.replace('</head>', head_add + '\n  </head>', 1)
sw = '''  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  </script>'''
html = html.replace('</body>', sw + '\n  </body>', 1)
open(p, 'w').write(html)
print('PWA index.html patched -> dist/ ready to deploy')
PY
