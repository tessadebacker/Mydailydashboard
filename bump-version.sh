#!/bin/sh
# Zet een nieuw versienummer op alle bestanden die de app laadt, zodat telefoons
# na een update meteen de nieuwe versie ophalen in plaats van een oude kopie uit hun cache.
# Gebruik: ./bump-version.sh            (versie = datum en tijd van nu)
#          ./bump-version.sh 2026.10.01 (eigen versienummer)
set -e
cd "$(dirname "$0")"
V="${1:-$(date +%Y.%m.%d.%H%M)}"
sed -i.bak -E "s/\?v=[0-9A-Za-z.]+/?v=$V/g" index.html script.js manifest.json
sed -i.bak -E "s/^const APP_VERSION = '[^']*';/const APP_VERSION = '$V';/" script.js
rm -f index.html.bak script.js.bak manifest.json.bak
echo "Versie: $V"
