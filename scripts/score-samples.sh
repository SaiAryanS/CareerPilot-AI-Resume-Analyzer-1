#!/usr/bin/env bash
# posts the sample JD + resume to the local Next.js API route /api/analyze-skills
# Usage: ./scripts/score-samples.sh
set -euo pipefail
BASE_URL=${ANALYZER_URL:-http://localhost:3000}
API_ENDPOINT="$BASE_URL/api/analyze-skills"
JD_FILE="$(pwd)/samples/fullstack-jd.txt"
RESUME_FILE="$(pwd)/samples/data-science-resume.txt"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl required"
  exit 1
fi

echo "Posting sample resume -> $API_ENDPOINT"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d @- <<EOF
{
  "jobDescription": "$(sed ':a;N;$!ba;s/"/\\"/g' "$JD_FILE")",
  "resume": "$(sed ':a;N;$!ba;s/"/\\"/g' "$RESUME_FILE")"
}
EOF
)

# pretty print if jq available
if command -v jq >/dev/null 2>&1; then
  echo "$RESPONSE" | jq
else
  echo "$RESPONSE"
fi
