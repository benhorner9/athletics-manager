#!/usr/bin/env bash
set -euo pipefail

STATE="${AM_PIPELINE_STATE:-running}"
STAGE="${AM_PIPELINE_STAGE:-qa}"
LABEL="${AM_PIPELINE_LABEL:-Development pipeline}"
PORT="${FTP_PORT:-21}"
BASE="ftp://${FTP_SERVER}:${PORT}/dev"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

python3 - <<'PY' > "$TMP"
from datetime import datetime, timezone
import json, os, subprocess
sha = os.environ.get('GITHUB_SHA','')
try:
    title = subprocess.check_output(['git','log','-1','--pretty=%s'], text=True).strip()
except Exception:
    title = ''
entry = {
    'channel': 'dev',
    'state': os.environ.get('AM_PIPELINE_STATE','running'),
    'stage': os.environ.get('AM_PIPELINE_STAGE','qa'),
    'label': os.environ.get('AM_PIPELINE_LABEL','Development pipeline'),
    'sha': sha,
    'shortSha': sha[:8],
    'title': title,
    'runId': os.environ.get('GITHUB_RUN_ID',''),
    'runNumber': os.environ.get('GITHUB_RUN_NUMBER',''),
    'updatedAt': datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
}
print(json.dumps(entry, indent=2))
PY

curl --insecure --fail --silent --show-error --ssl-reqd --ftp-create-dirs \
  --user "$FTP_USERNAME:$FTP_PASSWORD" \
  -T "$TMP" \
  "$BASE/dev-pipeline-status.json"

echo "Published dev pipeline status: $STATE / $STAGE / $LABEL"
